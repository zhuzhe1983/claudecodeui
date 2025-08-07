# Build stage
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ linux-headers

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with retry and longer timeout
RUN npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 5 && \
    npm ci

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Runtime stage
FROM node:20-alpine

# Install necessary packages for node-pty, shell functionality, and git
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
    ca-certificates \
    jq \
    sudo

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only with retry
RUN npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 5 && \
    npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/public ./public
COPY --from=builder /app/index.html ./index.html

# Install Claude Code
# Claude Code is typically installed globally, but we need to handle the installation
RUN curl -fsSL https://claude.ai/install.sh | sh || \
    echo "Claude Code will need to be installed manually"

# Create directories for Claude configuration
RUN mkdir -p /home/nodejs/.claude

# Run as root for file access
# Note: In production, consider using proper volume permissions

# Expose port
EXPOSE 9999

# Set environment variable for port
ENV PORT=9999

# Start the application directly
CMD ["node", "server/index.js"]