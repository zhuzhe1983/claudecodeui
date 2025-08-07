#!/bin/bash

# Quick Fix Script for Claude Code UI Docker Container
# This installs missing tools needed for Git and Shell functionality

echo "🔧 Installing essential tools for Git and Shell functionality..."
echo "Container: $(hostname)"
echo "Date: $(date)"

# Update package cache
echo "📦 Updating package cache..."
apk update

# Install essential packages
echo "📦 Installing git, bash, curl, and dependencies..."
apk add --no-cache git bash curl openssh-client ca-certificates

# Verify installations
echo "✅ Verifying installations..."
echo "Git version: $(git --version 2>/dev/null || echo 'FAILED')"
echo "Bash location: $(which bash 2>/dev/null || echo 'FAILED')"
echo "Curl version: $(curl --version 2>/dev/null | head -1 || echo 'FAILED')"

# Try to install Claude Code CLI
echo "🚀 Attempting to install Claude Code CLI..."
if npm install -g @anthropic-ai/claude-code; then
    echo "✅ Claude Code CLI installed successfully"
    echo "Claude version: $(claude --version 2>/dev/null || echo 'Command installed but may need restart')"
else
    echo "⚠️  Warning: Claude CLI installation failed (likely network issues)"
    echo "   You can try again later with: npm install -g @anthropic-ai/claude-code"
fi

echo ""
echo "🎉 Installation complete!"
echo "📋 Status Summary:"
echo "   - Git: $(git --version 2>/dev/null >/dev/null && echo 'OK' || echo 'FAILED')"
echo "   - Bash: $(which bash >/dev/null && echo 'OK' || echo 'FAILED')"
echo "   - Curl: $(which curl >/dev/null && echo 'OK' || echo 'FAILED')"
echo "   - Claude CLI: $(which claude >/dev/null && echo 'OK' || echo 'PENDING')"
echo ""
echo "🔄 You may need to restart the container for Shell functionality to work properly."
echo "🌐 Access the application at: http://192.168.199.8:9998"