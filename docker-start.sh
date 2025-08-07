#!/bin/bash

# ================================================
# Claude Code UI - Docker Deployment Script
# ================================================
# This script helps you quickly deploy Claude Code UI with Docker
# ================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ENV_FILE=".env.docker"
COMPOSE_FILE="docker-compose.yml"
ACTION="${1:-help}"

# Functions
print_banner() {
    echo -e "${GREEN}"
    echo "================================================"
    echo "  Claude Code UI - Docker Deployment"
    echo "================================================"
    echo -e "${NC}"
}

print_help() {
    echo "Usage: ./docker-start.sh [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  start       Start the application (build if needed)"
    echo "  stop        Stop the application"
    echo "  restart     Restart the application"
    echo "  rebuild     Force rebuild and start"
    echo "  logs        Show application logs"
    echo "  shell       Enter container shell"
    echo "  status      Show container status"
    echo "  clean       Stop and remove containers, volumes"
    echo "  setup       Initialize environment configuration"
    echo "  backup      Backup data directory"
    echo "  restore     Restore from backup"
    echo "  help        Show this help message"
    echo ""
    echo "Options:"
    echo "  --detach    Run in background (for start/restart)"
    echo "  --follow    Follow logs (for logs command)"
    echo "  --no-cache  Build without cache (for rebuild)"
    echo ""
    echo "Examples:"
    echo "  ./docker-start.sh start --detach"
    echo "  ./docker-start.sh logs --follow"
    echo "  ./docker-start.sh rebuild --no-cache"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Error: Docker is not installed${NC}"
        echo "Please install Docker first: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo -e "${RED}Error: Docker Compose is not installed${NC}"
        echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        echo -e "${RED}Error: Docker daemon is not running${NC}"
        echo "Please start Docker and try again"
        exit 1
    fi
}

check_claude_prerequisites() {
    echo -e "${BLUE}Checking Claude Code prerequisites...${NC}"
    
    # Check if Claude Code is installed
    if ! command -v claude &> /dev/null; then
        echo -e "${RED}❌ Claude Code is not installed${NC}"
        echo ""
        echo "Please install Claude Code first:"
        echo "  curl -fsSL https://claude.ai/install.sh | sh"
        echo ""
        return 1
    else
        echo -e "${GREEN}✅ Claude Code is installed${NC}"
    fi
    
    # Check if credentials exist
    if [ ! -f "$HOME/.claude/.credentials.json" ]; then
        echo -e "${RED}❌ Claude credentials not found${NC}"
        echo ""
        echo "Please authenticate with Claude:"
        echo "  claude setup-token"
        echo ""
        return 1
    else
        echo -e "${GREEN}✅ Claude credentials found${NC}"
    fi
    
    return 0
}

setup_env() {
    echo -e "${YELLOW}Setting up environment configuration...${NC}"
    
    # Check Claude prerequisites first
    if ! check_claude_prerequisites; then
        echo -e "${RED}Please fix Claude Code setup before continuing${NC}"
        exit 1
    fi
    
    if [ -f "$ENV_FILE" ]; then
        echo -e "${YELLOW}Warning: $ENV_FILE already exists${NC}"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Keeping existing configuration"
            return
        fi
    fi
    
    # Copy from example if it exists
    if [ -f ".env.example" ]; then
        cp .env.example "$ENV_FILE"
        echo -e "${GREEN}Created $ENV_FILE from .env.example${NC}"
        
        # Prompt for customization
        echo ""
        echo "Please customize your configuration:"
        read -p "External port (default 9998): " ext_port
        read -p "Your home directory (default $HOME): " home_dir
        read -p "Your workspace directory (default ~/Workspace): " workspace_dir
        
        # Update the env file with user inputs
        if [ ! -z "$ext_port" ]; then
            sed -i "s/EXTERNAL_PORT=.*/EXTERNAL_PORT=$ext_port/" "$ENV_FILE"
        fi
        if [ ! -z "$home_dir" ]; then
            sed -i "s|HOST_HOME=.*|HOST_HOME=$home_dir|" "$ENV_FILE"
        fi
        if [ ! -z "$workspace_dir" ]; then
            sed -i "s|HOST_WORKSPACE=.*|HOST_WORKSPACE=$workspace_dir|" "$ENV_FILE"
        fi
        
        echo -e "${GREEN}Configuration updated!${NC}"
    else
        # Create minimal env file
        cat > "$ENV_FILE" << EOF
# Docker environment configuration
PORT=9999
VITE_PORT=9999
EXTERNAL_PORT=9998
NODE_ENV=production
HOST_HOME=$HOME
HOST_WORKSPACE=$HOME/Workspace
ENABLE_AUTH=false
EOF
        echo -e "${GREEN}Created minimal $ENV_FILE${NC}"
    fi
    
    # Create data directory if it doesn't exist
    mkdir -p data
    echo -e "${GREEN}Data directory ready${NC}"
}

start_app() {
    print_banner
    check_docker
    
    # Always check Claude prerequisites before starting
    if ! check_claude_prerequisites; then
        echo -e "${RED}Cannot start without Claude Code setup${NC}"
        exit 1
    fi
    
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${YELLOW}No environment configuration found${NC}"
        setup_env
    fi
    
    echo -e "${GREEN}Starting Claude Code UI...${NC}"
    
    # Check for --detach flag
    if [[ " $@ " =~ " --detach " ]]; then
        docker-compose -f "$COMPOSE_FILE" up -d --build
        echo -e "${GREEN}Application started in background${NC}"
        echo ""
        docker-compose ps
        echo ""
        echo -e "${GREEN}Access the application at: http://localhost:$(grep EXTERNAL_PORT $ENV_FILE | cut -d= -f2 | tr -d ' ')${NC}"
    else
        docker-compose -f "$COMPOSE_FILE" up --build
    fi
}

stop_app() {
    print_banner
    check_docker
    
    echo -e "${YELLOW}Stopping Claude Code UI...${NC}"
    docker-compose -f "$COMPOSE_FILE" down
    echo -e "${GREEN}Application stopped${NC}"
}

restart_app() {
    stop_app
    start_app "$@"
}

rebuild_app() {
    print_banner
    check_docker
    
    echo -e "${YELLOW}Rebuilding Claude Code UI...${NC}"
    
    # Check for --no-cache flag
    if [[ " $@ " =~ " --no-cache " ]]; then
        docker-compose -f "$COMPOSE_FILE" build --no-cache
    else
        docker-compose -f "$COMPOSE_FILE" build
    fi
    
    # Check for --detach flag
    if [[ " $@ " =~ " --detach " ]]; then
        docker-compose -f "$COMPOSE_FILE" up -d
    else
        docker-compose -f "$COMPOSE_FILE" up
    fi
}

show_logs() {
    print_banner
    check_docker
    
    # Check for --follow flag
    if [[ " $@ " =~ " --follow " ]]; then
        docker-compose -f "$COMPOSE_FILE" logs -f
    else
        docker-compose -f "$COMPOSE_FILE" logs --tail=100
    fi
}

enter_shell() {
    print_banner
    check_docker
    
    container_name=$(docker-compose -f "$COMPOSE_FILE" ps -q claudecodeui)
    if [ -z "$container_name" ]; then
        echo -e "${RED}Error: Container is not running${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Entering container shell...${NC}"
    docker exec -it "$container_name" /bin/bash
}

show_status() {
    print_banner
    check_docker
    
    echo -e "${GREEN}Container Status:${NC}"
    docker-compose -f "$COMPOSE_FILE" ps
    
    echo ""
    echo -e "${GREEN}Resource Usage:${NC}"
    container_name=$(docker-compose -f "$COMPOSE_FILE" ps -q claudecodeui)
    if [ ! -z "$container_name" ]; then
        docker stats --no-stream "$container_name"
    fi
}

clean_all() {
    print_banner
    
    echo -e "${RED}Warning: This will remove containers and volumes!${NC}"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled"
        exit 0
    fi
    
    docker-compose -f "$COMPOSE_FILE" down -v
    echo -e "${GREEN}Cleanup complete${NC}"
}

backup_data() {
    print_banner
    
    timestamp=$(date +%Y%m%d_%H%M%S)
    backup_file="backup_claudecodeui_$timestamp.tar.gz"
    
    echo -e "${GREEN}Creating backup...${NC}"
    tar -czf "$backup_file" data/
    echo -e "${GREEN}Backup created: $backup_file${NC}"
}

restore_data() {
    print_banner
    
    if [ -z "$2" ]; then
        echo -e "${RED}Error: Please specify backup file${NC}"
        echo "Usage: ./docker-start.sh restore backup_file.tar.gz"
        exit 1
    fi
    
    if [ ! -f "$2" ]; then
        echo -e "${RED}Error: Backup file not found: $2${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Warning: This will overwrite existing data!${NC}"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled"
        exit 0
    fi
    
    echo -e "${GREEN}Restoring from backup...${NC}"
    tar -xzf "$2"
    echo -e "${GREEN}Restore complete${NC}"
}

# Main execution
case "$ACTION" in
    start)
        start_app "$@"
        ;;
    stop)
        stop_app
        ;;
    restart)
        restart_app "$@"
        ;;
    rebuild)
        rebuild_app "$@"
        ;;
    logs)
        show_logs "$@"
        ;;
    shell)
        enter_shell
        ;;
    status)
        show_status
        ;;
    clean)
        clean_all
        ;;
    setup)
        setup_env
        ;;
    backup)
        backup_data
        ;;
    restore)
        restore_data "$@"
        ;;
    help|--help|-h|*)
        print_banner
        print_help
        ;;
esac