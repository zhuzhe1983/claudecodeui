// Load environment variables from .env file
try {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '../.env');
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0 && !process.env[key]) {
        process.env[key] = valueParts.join('=').trim();
      }
    }
  });
} catch (e) {
  console.log('No .env file found or error reading it:', e.message);
}

console.log('PORT from env:', process.env.PORT);

const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');
const cors = require('cors');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const os = require('os');
const pty = require('node-pty');
const { getProjects, getSessions, getSessionMessages, renameProject, deleteSession, deleteProject, addProjectManually } = require('./projects');
const { spawnClaude, abortClaudeSession } = require('./claude-cli');

// File system watcher for projects folder
let projectsWatcher = null;
const connectedClients = new Set();

// Setup file system watcher for Claude projects folder using chokidar
function setupProjectsWatcher() {
  const chokidar = require('chokidar');
  const claudeProjectsPath = path.join(process.env.HOME, '.claude', 'projects');
  
  if (projectsWatcher) {
    projectsWatcher.close();
  }
  
  try {
    // Initialize chokidar watcher with optimized settings
    projectsWatcher = chokidar.watch(claudeProjectsPath, {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/*.tmp',
        '**/*.swp',
        '**/.DS_Store'
      ],
      persistent: true,
      ignoreInitial: true, // Don't fire events for existing files on startup
      followSymlinks: false,
      depth: 10, // Reasonable depth limit
      awaitWriteFinish: {
        stabilityThreshold: 100, // Wait 100ms for file to stabilize
        pollInterval: 50
      }
    });
    
    // Debounce function to prevent excessive notifications
    let debounceTimer;
    const debouncedUpdate = async (eventType, filePath) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        try {
          
          // Get updated projects list
          const updatedProjects = await getProjects();
          
          // Notify all connected clients about the project changes
          const updateMessage = JSON.stringify({
            type: 'projects_updated',
            projects: updatedProjects,
            timestamp: new Date().toISOString(),
            changeType: eventType,
            changedFile: path.relative(claudeProjectsPath, filePath)
          });
          
          connectedClients.forEach(client => {
            if (client.readyState === client.OPEN) {
              client.send(updateMessage);
            }
          });
          
        } catch (error) {
          console.error('❌ Error handling project changes:', error);
        }
      }, 300); // 300ms debounce (slightly faster than before)
    };
    
    // Set up event listeners
    projectsWatcher
      .on('add', (filePath) => debouncedUpdate('add', filePath))
      .on('change', (filePath) => debouncedUpdate('change', filePath))
      .on('unlink', (filePath) => debouncedUpdate('unlink', filePath))
      .on('addDir', (dirPath) => debouncedUpdate('addDir', dirPath))
      .on('unlinkDir', (dirPath) => debouncedUpdate('unlinkDir', dirPath))
      .on('error', (error) => {
        console.error('❌ Chokidar watcher error:', error);
      })
      .on('ready', () => {
      });
    
  } catch (error) {
    console.error('❌ Failed to setup projects watcher:', error);
  }
}

// Get the first non-localhost IP address
function getServerIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const app = express();
const server = http.createServer(app);

// Single WebSocket server that handles both paths
const wss = new WebSocketServer({ 
  server,
  verifyClient: (info) => {
    console.log('WebSocket connection attempt to:', info.req.url);
    return true; // Accept all connections for now
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// API Routes
app.get('/api/config', (req, res) => {
  // Always use the server's actual IP and port for WebSocket connections
  const serverIP = getServerIP();
  const host = `${serverIP}:${PORT}`;
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'wss' : 'ws';
  
  console.log('Config API called - Returning host:', host, 'Protocol:', protocol);
  
  res.json({
    serverPort: PORT,
    wsUrl: `${protocol}://${host}`
  });
});

app.get('/api/projects', async (req, res) => {
  try {
    const projects = await getProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects/:projectName/sessions', async (req, res) => {
  try {
    const { limit = 5, offset = 0 } = req.query;
    const result = await getSessions(req.params.projectName, parseInt(limit), parseInt(offset));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages for a specific session
app.get('/api/projects/:projectName/sessions/:sessionId/messages', async (req, res) => {
  try {
    const { projectName, sessionId } = req.params;
    const messages = await getSessionMessages(projectName, sessionId);
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rename project endpoint
app.put('/api/projects/:projectName/rename', async (req, res) => {
  try {
    const { displayName } = req.body;
    await renameProject(req.params.projectName, displayName);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete session endpoint
app.delete('/api/projects/:projectName/sessions/:sessionId', async (req, res) => {
  try {
    const { projectName, sessionId } = req.params;
    await deleteSession(projectName, sessionId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete project endpoint (only if empty)
app.delete('/api/projects/:projectName', async (req, res) => {
  try {
    const { projectName } = req.params;
    await deleteProject(projectName);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create project endpoint
app.post('/api/projects/create', async (req, res) => {
  try {
    const { path: projectPath } = req.body;
    
    if (!projectPath || !projectPath.trim()) {
      return res.status(400).json({ error: 'Project path is required' });
    }
    
    const project = await addProjectManually(projectPath.trim());
    res.json({ success: true, project });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Read file content endpoint
app.get('/api/projects/:projectName/file', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { filePath } = req.query;
    
    console.log('📄 File read request:', projectName, filePath);
    
    const fs = require('fs').promises;
    
    // Security check - ensure the path is safe and absolute
    if (!filePath || !path.isAbsolute(filePath)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }
    
    const content = await fs.readFile(filePath, 'utf8');
    res.json({ content, path: filePath });
  } catch (error) {
    console.error('Error reading file:', error);
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'File not found' });
    } else if (error.code === 'EACCES') {
      res.status(403).json({ error: 'Permission denied' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Serve binary file content endpoint (for images, etc.)
app.get('/api/projects/:projectName/files/content', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { path: filePath } = req.query;
    
    console.log('🖼️ Binary file serve request:', projectName, filePath);
    
    const fs = require('fs');
    const mime = require('mime-types');
    
    // Security check - ensure the path is safe and absolute
    if (!filePath || !path.isAbsolute(filePath)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }
    
    // Check if file exists
    try {
      await fs.promises.access(filePath);
    } catch (error) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Get file extension and set appropriate content type
    const mimeType = mime.lookup(filePath) || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading file' });
      }
    });
    
  } catch (error) {
    console.error('Error serving binary file:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

// Save file content endpoint
app.put('/api/projects/:projectName/file', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { filePath, content } = req.body;
    
    console.log('💾 File save request:', projectName, filePath);
    
    const fs = require('fs').promises;
    
    // Security check - ensure the path is safe and absolute
    if (!filePath || !path.isAbsolute(filePath)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }
    
    if (content === undefined) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    // Create backup of original file
    try {
      const backupPath = filePath + '.backup.' + Date.now();
      await fs.copyFile(filePath, backupPath);
      console.log('📋 Created backup:', backupPath);
    } catch (backupError) {
      console.warn('Could not create backup:', backupError.message);
    }
    
    // Write the new content
    await fs.writeFile(filePath, content, 'utf8');
    
    res.json({ 
      success: true, 
      path: filePath,
      message: 'File saved successfully' 
    });
  } catch (error) {
    console.error('Error saving file:', error);
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'File or directory not found' });
    } else if (error.code === 'EACCES') {
      res.status(403).json({ error: 'Permission denied' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

app.get('/api/projects/:projectName/files', async (req, res) => {
  try {
    
    const fs = require('fs').promises;
    const projectPath = path.join(process.env.HOME, '.claude', 'projects', req.params.projectName);
    
    // Try different methods to get the actual project path
    let actualPath = projectPath;
    
    try {
      // First try to read metadata.json
      const metadataPath = path.join(projectPath, 'metadata.json');
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
      actualPath = metadata.path || metadata.cwd;
    } catch (e) {
      // Fallback: try to find the actual path by testing different dash interpretations
      let testPath = req.params.projectName;
      if (testPath.startsWith('-')) {
        testPath = testPath.substring(1);
      }
      
      // Try to intelligently decode the path by testing which directories exist
      const pathParts = testPath.split('-');
      actualPath = '/' + pathParts.join('/');
      
      // If the simple replacement doesn't work, try to find the correct path
      // by testing combinations where some dashes might be part of directory names
      if (!require('fs').existsSync(actualPath)) {
        // Try different combinations of dash vs slash
        for (let i = pathParts.length - 1; i >= 0; i--) {
          let testParts = [...pathParts];
          // Try joining some parts with dashes instead of slashes
          for (let j = i; j < testParts.length - 1; j++) {
            testParts[j] = testParts[j] + '-' + testParts[j + 1];
            testParts.splice(j + 1, 1);
            let testActualPath = '/' + testParts.join('/');
            if (require('fs').existsSync(testActualPath)) {
              actualPath = testActualPath;
              break;
            }
          }
          if (require('fs').existsSync(actualPath)) break;
        }
      }
      
    }
    
    // Check if path exists
    try {
      await fs.access(actualPath);
    } catch (e) {
      return res.status(404).json({ error: `Project path not found: ${actualPath}` });
    }
    
    const files = await getFileTree(actualPath, 3, 0, true);
    const hiddenFiles = files.filter(f => f.name.startsWith('.'));
    console.log('📄 Found', files.length, 'files/folders, including', hiddenFiles.length, 'hidden files');
    console.log('🔍 Hidden files:', hiddenFiles.map(f => f.name));
    res.json(files);
  } catch (error) {
    console.error('❌ File tree error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// WebSocket connection handler that routes based on URL path
wss.on('connection', (ws, request) => {
  const url = request.url;
  console.log('🔗 Client connected to:', url);
  
  if (url === '/shell') {
    handleShellConnection(ws);
  } else if (url === '/ws') {
    handleChatConnection(ws);
  } else {
    console.log('❌ Unknown WebSocket path:', url);
    ws.close();
  }
});

// Handle chat WebSocket connections
function handleChatConnection(ws) {
  console.log('💬 Chat WebSocket connected');
  
  // Add to connected clients for project updates
  connectedClients.add(ws);
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'claude-command') {
        console.log('💬 User message:', data.command || '[Continue/Resume]');
        console.log('📁 Project:', data.options?.projectPath || 'Unknown');
        console.log('🔄 Session:', data.options?.sessionId ? 'Resume' : 'New');
        await spawnClaude(data.command, data.options, ws);
      } else if (data.type === 'abort-session') {
        console.log('🛑 Abort session request:', data.sessionId);
        const success = abortClaudeSession(data.sessionId);
        ws.send(JSON.stringify({
          type: 'session-aborted',
          sessionId: data.sessionId,
          success
        }));
      }
    } catch (error) {
      console.error('❌ Chat WebSocket error:', error.message);
      ws.send(JSON.stringify({
        type: 'error',
        error: error.message
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('🔌 Chat client disconnected');
    // Remove from connected clients
    connectedClients.delete(ws);
  });
}

// Handle shell WebSocket connections
function handleShellConnection(ws) {
  console.log('🐚 Shell client connected');
  let shellProcess = null;
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📨 Shell message received:', data.type);
      
      if (data.type === 'init') {
        // Initialize shell with project path and session info
        const projectPath = data.projectPath || process.cwd();
        const sessionId = data.sessionId;
        const hasSession = data.hasSession;
        
        console.log('🚀 Starting shell in:', projectPath);
        console.log('📋 Session info:', hasSession ? `Resume session ${sessionId}` : 'New session');
        
        // First send a welcome message
        const welcomeMsg = hasSession ? 
          `\x1b[36mResuming Claude session ${sessionId} in: ${projectPath}\x1b[0m\r\n` :
          `\x1b[36mStarting new Claude session in: ${projectPath}\x1b[0m\r\n`;
        
        ws.send(JSON.stringify({
          type: 'output',
          data: welcomeMsg
        }));
        
        try {
          // Build shell command that changes to project directory first, then runs claude
          let claudeCommand = 'claude';
          
          if (hasSession && sessionId) {
            // Try to resume session, but with fallback to new session if it fails
            claudeCommand = `claude --resume ${sessionId} || claude`;
          }
          
          // Create shell command that cds to the project directory first
          const shellCommand = `cd "${projectPath}" && ${claudeCommand}`;
          
          console.log('🔧 Executing shell command:', shellCommand);
          
          // Start shell using PTY for proper terminal emulation
          shellProcess = pty.spawn('bash', ['-c', shellCommand], {
            name: 'xterm-256color',
            cols: 80,
            rows: 24,
            cwd: process.env.HOME || '/', // Start from home directory
            env: { 
              ...process.env,
              TERM: 'xterm-256color',
              COLORTERM: 'truecolor',
              FORCE_COLOR: '3',
              // Override browser opening commands to echo URL for detection
              BROWSER: 'echo "OPEN_URL:"'
            }
          });
          
          console.log('🟢 Shell process started with PTY, PID:', shellProcess.pid);
          
          // Handle data output
          shellProcess.onData((data) => {
            if (ws.readyState === ws.OPEN) {
              let outputData = data;
              
              // Check for various URL opening patterns
              const patterns = [
                // Direct browser opening commands
                /(?:xdg-open|open|start)\s+(https?:\/\/[^\s\x1b\x07]+)/g,
                // BROWSER environment variable override
                /OPEN_URL:\s*(https?:\/\/[^\s\x1b\x07]+)/g,
                // Git and other tools opening URLs
                /Opening\s+(https?:\/\/[^\s\x1b\x07]+)/gi,
                // General URL patterns that might be opened
                /Visit:\s*(https?:\/\/[^\s\x1b\x07]+)/gi,
                /View at:\s*(https?:\/\/[^\s\x1b\x07]+)/gi,
                /Browse to:\s*(https?:\/\/[^\s\x1b\x07]+)/gi
              ];
              
              patterns.forEach(pattern => {
                let match;
                while ((match = pattern.exec(data)) !== null) {
                  const url = match[1];
                  console.log('🔗 Detected URL for opening:', url);
                  
                  // Send URL opening message to client
                  ws.send(JSON.stringify({
                    type: 'url_open',
                    url: url
                  }));
                  
                  // Replace the OPEN_URL pattern with a user-friendly message
                  if (pattern.source.includes('OPEN_URL')) {
                    outputData = outputData.replace(match[0], `🌐 Opening in browser: ${url}`);
                  }
                }
              });
              
              // Send regular output
              ws.send(JSON.stringify({
                type: 'output',
                data: outputData
              }));
            }
          });
          
          // Handle process exit
          shellProcess.onExit((exitCode) => {
            console.log('🔚 Shell process exited with code:', exitCode.exitCode, 'signal:', exitCode.signal);
            if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify({
                type: 'output',
                data: `\r\n\x1b[33mProcess exited with code ${exitCode.exitCode}${exitCode.signal ? ` (${exitCode.signal})` : ''}\x1b[0m\r\n`
              }));
            }
            shellProcess = null;
          });
          
        } catch (spawnError) {
          console.error('❌ Error spawning process:', spawnError);
          ws.send(JSON.stringify({
            type: 'output',
            data: `\r\n\x1b[31mError: ${spawnError.message}\x1b[0m\r\n`
          }));
        }
        
      } else if (data.type === 'input') {
        // Send input to shell process
        if (shellProcess && shellProcess.write) {
          try {
            shellProcess.write(data.data);
          } catch (error) {
            console.error('Error writing to shell:', error);
          }
        } else {
          console.warn('No active shell process to send input to');
        }
      } else if (data.type === 'resize') {
        // Handle terminal resize
        if (shellProcess && shellProcess.resize) {
          console.log('Terminal resize requested:', data.cols, 'x', data.rows);
          shellProcess.resize(data.cols, data.rows);
        }
      }
    } catch (error) {
      console.error('❌ Shell WebSocket error:', error.message);
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'output',
          data: `\r\n\x1b[31mError: ${error.message}\x1b[0m\r\n`
        }));
      }
    }
  });
  
  ws.on('close', () => {
    console.log('🔌 Shell client disconnected');
    if (shellProcess && shellProcess.kill) {
      console.log('🔴 Killing shell process:', shellProcess.pid);
      shellProcess.kill();
    }
  });
  
  ws.on('error', (error) => {
    console.error('❌ Shell WebSocket error:', error);
  });
}

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

async function getFileTree(dirPath, maxDepth = 3, currentDepth = 0, showHidden = true) {
  const fs = require('fs').promises;
  const items = [];
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      // Debug: log all entries including hidden files
      if (entry.name.startsWith('.')) {
        console.log('📁 Found hidden file/folder:', entry.name, 'at depth:', currentDepth);
      }
      
      // Skip only heavy build directories
      if (entry.name === 'node_modules' || 
          entry.name === 'dist' || 
          entry.name === 'build') continue;
      
      const item = {
        name: entry.name,
        path: path.join(dirPath, entry.name),
        type: entry.isDirectory() ? 'directory' : 'file'
      };
      
      if (entry.isDirectory() && currentDepth < maxDepth) {
        // Recursively get subdirectories but limit depth
        try {
          // Check if we can access the directory before trying to read it
          await fs.access(item.path, fs.constants.R_OK);
          item.children = await getFileTree(item.path, maxDepth, currentDepth + 1, showHidden);
        } catch (e) {
          // Silently skip directories we can't access (permission denied, etc.)
          item.children = [];
        }
      }
      
      items.push(item);
    }
  } catch (error) {
    // Only log non-permission errors to avoid spam
    if (error.code !== 'EACCES' && error.code !== 'EPERM') {
      console.error('Error reading directory:', error);
    }
  }
  
  return items.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Claude Code UI server running on http://0.0.0.0:${PORT}`);
  
  // Start watching the projects folder for changes
  setupProjectsWatcher();
});