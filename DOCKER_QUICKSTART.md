# 🐳 Claude Code UI - Docker Quick Start Guide

## 📋 Prerequisites

- Docker 20.10+ installed
- Docker Compose 2.0+ installed
- At least 2GB of available RAM
- Port 9998 available (configurable)

## 🚀 Quick Start (One Command)

```bash
# Clone the repository
git clone git@github.com:zhuzhe1983/claudecodeui.git
cd claudecodeui

# Start with the convenience script
./docker-start.sh start --detach
```

That's it! Access the application at http://localhost:9998

## 📦 Installation Options

### Option 1: Using the Convenience Script (Recommended)

```bash
# First time setup
./docker-start.sh setup    # Configure environment
./docker-start.sh start     # Start the application

# Other useful commands
./docker-start.sh status    # Check status
./docker-start.sh logs      # View logs
./docker-start.sh stop      # Stop the application
./docker-start.sh restart   # Restart the application
./docker-start.sh shell     # Enter container shell
```

### Option 2: Using Docker Compose Directly

```bash
# Copy and customize environment file
cp .env.example .env.docker
nano .env.docker  # Edit configuration

# Start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

### Option 3: Using Pre-built Image

```bash
# Pull the image (if available)
docker pull ghcr.io/zhuzhe1983/claudecodeui:latest

# Run with minimal configuration
docker run -d \
  --name claudecodeui \
  -p 9998:9999 \
  -v ~/.claude:/home/nodejs/.claude:ro \
  -v ~/Workspace:/home/zhuzhe/Workspace \
  ghcr.io/zhuzhe1983/claudecodeui:latest
```

## ⚙️ Configuration

### Essential Environment Variables

Create a `.env.docker` file with your settings:

```env
# Port Configuration
EXTERNAL_PORT=9998           # Port to access from browser
PORT=9999                    # Internal application port

# Path Configuration
HOST_HOME=/home/zhuzhe       # Your home directory
HOST_WORKSPACE=/home/zhuzhe/Workspace  # Your projects directory

# Features
ENABLE_AUTH=false            # Disable authentication
DEFAULT_LANGUAGE=en          # or 'zh' for Chinese
ENABLE_VOICE_INPUT=true      # Voice input support
ENABLE_MONACO_EDITOR=true    # VS Code editor

# Claude API Configuration (REQUIRED for Claude Code)
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

### 🔐 Claude Code Authentication

Claude Code UI requires Claude Code to be set up on your system first.

**Prerequisites:**
1. Install Claude Code on your host system:
   ```bash
   # Install Claude Code
   curl -fsSL https://claude.ai/install.sh | sh
   
   # Authenticate with Claude
   claude setup-token
   ```

2. Verify Claude credentials exist:
   ```bash
   ls ~/.claude/.credentials.json
   # This file MUST exist before starting Docker
   ```

**Docker Setup:**
```bash
# Copy environment template
cp .env.example .env.docker

# Start the application (mounts your ~/.claude directory)
docker-compose up -d
```

**How it works:**
- Docker mounts your `~/.claude` directory (read-only)
- This includes `.credentials.json` with your authentication
- The container can access Claude Code with your credentials

### 🎤 Voice Input (Optional)

The Voice Input feature uses OpenAI's Whisper for transcription:

```bash
# Add to .env.docker if you want voice input:
OPENAI_API_KEY=sk-your-openai-key-here

# Voice input features:
# - Speech-to-text transcription
# - Prompt enhancement modes
# - Multi-language support
```

**Without OpenAI key:** Voice input button will be disabled

### Advanced Configuration

See `.env.example` for all available options including:
- Custom LLM/TTS endpoints for offline deployment
- Security settings (authentication, CORS, rate limiting)
- Performance tuning (cache, connection limits)
- Feature flags (Git, Shell, File Browser)
- Logging and monitoring

## 🗂️ Directory Structure

```
claudecodeui/
├── docker-compose.yml      # Docker Compose configuration
├── Dockerfile             # Container build instructions
├── .env.example          # Environment variables template
├── .env.docker          # Your custom configuration (create this)
├── docker-start.sh      # Convenience script
├── data/               # Persistent data (database, sessions)
└── ...                # Application source code
```

## 🔧 Common Use Cases

### 1. Change External Port

Edit `.env.docker`:
```env
EXTERNAL_PORT=8080  # Access at http://localhost:8080
```

### 2. Use Custom Workspace Directory

Edit `.env.docker`:
```env
HOST_WORKSPACE=/path/to/your/projects
```

### 3. Enable Authentication

Edit `.env.docker`:
```env
ENABLE_AUTH=true
SESSION_SECRET=your-very-secret-key-here
```

### 4. Use Custom LLM Server (Offline Mode)

Edit `.env.docker`:
```env
CUSTOM_LLM_ENDPOINT=http://your-llm-server:8080/v1
CUSTOM_LLM_API_KEY=your-api-key
CUSTOM_LLM_MODEL=gpt-4
```

### 5. Use Custom TTS Server

Edit `.env.docker`:
```env
CUSTOM_TTS_ENDPOINT=http://your-tts-server:5000/api/tts
CUSTOM_TTS_API_KEY=your-tts-key
```

## 📊 Container Management

### View Container Status
```bash
./docker-start.sh status
# or
docker-compose ps
```

### View Logs
```bash
./docker-start.sh logs --follow
# or
docker-compose logs -f claudecodeui
```

### Enter Container Shell
```bash
./docker-start.sh shell
# or
docker exec -it claudecodeui-app /bin/bash
```

### Resource Usage
```bash
docker stats claudecodeui-app
```

## 💾 Backup and Restore

### Create Backup
```bash
./docker-start.sh backup
# Creates: backup_claudecodeui_YYYYMMDD_HHMMSS.tar.gz
```

### Restore from Backup
```bash
./docker-start.sh restore backup_claudecodeui_20240101_120000.tar.gz
```

### Manual Backup
```bash
tar -czf claudecodeui_backup.tar.gz data/
```

## 🔄 Updating

### Update to Latest Version
```bash
git pull
./docker-start.sh rebuild --no-cache
```

### Update Without Cache
```bash
docker-compose build --no-cache
docker-compose up -d
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Check what's using the port
lsof -i :9998

# Change port in .env.docker
EXTERNAL_PORT=9999
```

### Permission Issues
```bash
# Fix data directory permissions
sudo chown -R 1000:1000 data/

# Or run with your user ID
docker-compose run --user $(id -u):$(id -g) claudecodeui
```

### Container Won't Start
```bash
# Check logs
docker-compose logs claudecodeui

# Check health status
docker inspect claudecodeui-app --format='{{.State.Health.Status}}'

# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

### Claude Code Issues
```bash
# Check if Claude credentials are mounted
docker exec claudecodeui-app ls -la /home/nodejs/.claude/

# Verify credentials file exists
docker exec claudecodeui-app cat /home/nodejs/.claude/.credentials.json

# Test Claude command in container
docker exec claudecodeui-app claude --version

# If Claude not found, check installation
docker exec claudecodeui-app which claude
```

### Network Issues
```bash
# Use host network (less isolated but may resolve issues)
docker run --network host ...
```

## 🔒 Security Considerations

1. **Authentication**: Disabled by default. Enable in production:
   ```env
   ENABLE_AUTH=true
   SESSION_SECRET=<generate-strong-secret>
   ```

2. **HTTPS**: For production, use a reverse proxy (nginx/traefik):
   ```nginx
   server {
     listen 443 ssl;
     ssl_certificate /path/to/cert.pem;
     ssl_certificate_key /path/to/key.pem;
     
     location / {
       proxy_pass http://localhost:9998;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
     }
   }
   ```

3. **Firewall**: Restrict access to trusted IPs only:
   ```bash
   ufw allow from 192.168.1.0/24 to any port 9998
   ```

## 🎯 Performance Optimization

### Limit Resources
```yaml
# In docker-compose.yml
services:
  claudecodeui:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### Enable Caching
```env
ENABLE_CACHE=true
CACHE_TTL=3600
```

### Optimize for Production
```env
NODE_ENV=production
LOG_LEVEL=warn
ENABLE_REQUEST_LOGGING=false
```

## 📝 Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `EXTERNAL_PORT` | 9998 | External port for browser access |
| `PORT` | 9999 | Internal application port |
| `NODE_ENV` | production | Node environment |
| `ENABLE_AUTH` | false | Enable authentication |
| `DEFAULT_LANGUAGE` | en | Default UI language (en/zh) |
| `HOST_WORKSPACE` | ~/Workspace | Your projects directory |
| `LOG_LEVEL` | info | Logging level |
| `ENABLE_VOICE_INPUT` | true | Voice input feature |
| `ENABLE_MONACO_EDITOR` | true | VS Code editor |
| `CUSTOM_LLM_ENDPOINT` | - | Custom LLM server URL |
| `CUSTOM_TTS_ENDPOINT` | - | Custom TTS server URL |

See `.env.example` for complete list.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Test with Docker
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file

## 🆘 Support

- Issues: https://github.com/zhuzhe1983/claudecodeui/issues
- Discussions: https://github.com/zhuzhe1983/claudecodeui/discussions

---

Happy coding with Claude Code UI! 🎉