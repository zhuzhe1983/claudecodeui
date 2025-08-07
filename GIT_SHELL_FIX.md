# Git and Shell Functionality Fix for Docker Deployment

## Root Cause Analysis

After thorough investigation of the Claude Code UI Docker deployment, I identified the core issues preventing Git and Shell functionality:

### **Critical Issues Found:**

1. **Git Not Installed** - The Alpine Linux container doesn't include git
2. **Bash Shell Missing** - Only `ash` shell available via busybox  
3. **Claude Code CLI Missing** - The official Anthropic Claude CLI not installed
4. **File Permissions** - Workspace volume mounted read-only, preventing git write operations

## Evidence of Issues

```bash
# Commands run in the original container showed:
docker exec claudecodeui-app which git       # Returns: (not found)
docker exec claudecodeui-app which bash      # Returns: (not found)  
docker exec claudecodeui-app which claude    # Returns: (not found)

# Only ash shell was available:
docker exec claudecodeui-app ls -la /bin/ | grep sh
# Output: sh -> /bin/busybox (ash shell only)
```

## Comprehensive Fixes Applied

### 1. Updated Dockerfile
Added essential packages to the runtime stage:

```dockerfile
# Install necessary packages for node-pty, shell functionality, git, and Claude CLI dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    linux-headers \
    wget \
    git \
    bash \
    curl \
    openssh-client \
    ca-certificates

# Install Claude Code CLI (official Anthropic CLI)
RUN npm install -g @anthropic-ai/claude-code
```

### 2. Updated docker-compose.yml
Fixed volume permissions:

```yaml
volumes:
  # Mount workspace directory for project access (read-write for git operations)
  - ~/Workspace:/home/zhuzhe/Workspace  # Removed :ro flag
```

### 3. Server Code Compatibility
- Confirmed server code uses `bash` for shell spawning (line 548 in server/index.js)
- Git API routes properly implemented and should work with git installed
- WebSocket shell connection logic is correct

## Quick Fix for Current Deployment

If you need Git functionality working immediately without rebuilding:

```bash
# Install tools in the running container:
docker exec claudecodeui-app sh -c "apk add --no-cache git bash curl"
```

## Complete Solution - Rebuild Instructions

1. **Stop current container:**
   ```bash
   docker compose down
   ```

2. **Rebuild with fixes:**
   ```bash
   docker compose build --no-cache
   docker compose up -d
   ```

3. **Verify installations:**
   ```bash
   docker exec claudecodeui-app git --version
   docker exec claudecodeui-app bash --version
   docker exec claudecodeui-app claude --version
   ```

## Testing the Fixes

### Git Panel Testing
1. Navigate to a project with git repository
2. Git tab should show:
   - Current branch name
   - File change status (Modified, Added, Deleted, Untracked)
   - Commit functionality
   - Branch switching capabilities

### Shell Tab Testing  
1. Select a project
2. Click "Continue in Shell" 
3. Should see bash shell with:
   - Proper terminal colors and formatting
   - Claude CLI available (`claude` command)
   - Git commands working
   - Project directory as working directory

## Architecture Overview

The application architecture for Git and Shell:

```
Client (React)
├── GitPanel.jsx - Manages git operations via REST API
├── Shell.jsx - Terminal emulation via WebSocket
└── API calls to /api/git/* endpoints

Server (Node.js)
├── /api/git/* routes - Git operations using child_process.exec
├── WebSocket /shell - Terminal communication using node-pty
└── Docker container with git, bash, claude-cli installed
```

## Network Configuration

According to project instructions, access the application at:
- **http://192.168.199.8:9998** (not localhost:9998)

## Troubleshooting

**If Git operations fail:**
- Check file permissions in mounted volume
- Verify git is installed: `docker exec claudecodeui-app git --version`

**If Shell connection fails:**  
- Check WebSocket connection in browser dev tools
- Verify bash is available: `docker exec claudecodeui-app which bash`

**If Claude CLI is missing:**
- Run: `docker exec claudecodeui-app npm install -g @anthropic-ai/claude-code`

## Files Modified

1. `/home/zhuzhe/Workspace/claudecodeui/Dockerfile` - Added package installations
2. `/home/zhuzhe/Workspace/claudecodeui/docker-compose.yml` - Fixed volume permissions  
3. `/home/zhuzhe/Workspace/claudecodeui/server/index.js` - Added compatibility comment