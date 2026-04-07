#!/bin/bash
set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}"
echo '  ╔═══════════════════════════════════════════════╗'
echo '  ║       MTProto Proxy Panel — Installer         ║'
echo '  ╚═══════════════════════════════════════════════╝'
echo -e "${NC}"

# Root check
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Error: Please run as root${NC}"
  exit 1
fi

# Docker check
if ! command -v docker &> /dev/null; then
  echo -e "${GREEN}[1/5]${NC} Installing Docker..."
  curl -fsSL https://get.docker.com | sh
else
  echo -e "${GREEN}[1/5]${NC} Docker found"
fi

if ! docker compose version &> /dev/null; then
  echo -e "${RED}Error: Docker Compose not found. Install it first.${NC}"
  exit 1
fi

# Install directory
INSTALL_DIR="/opt/mtproto-panel"
echo -e "${GREEN}[2/5]${NC} Setting up ${INSTALL_DIR}..."

if [ -d "$INSTALL_DIR" ] && [ -f "$INSTALL_DIR/docker-compose.yml" ]; then
  echo -e "  Existing installation found. Updating..."
  cd "$INSTALL_DIR"
  docker compose down 2>/dev/null || true
else
  mkdir -p "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

# Clone or update
if [ -d ".git" ]; then
  git pull origin main 2>/dev/null || true
else
  # Copy files if running from cloned repo, otherwise clone
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if [ -f "$SCRIPT_DIR/docker-compose.yml" ] && [ "$SCRIPT_DIR" != "$INSTALL_DIR" ]; then
    cp -r "$SCRIPT_DIR"/* "$INSTALL_DIR/" 2>/dev/null || true
    cp "$SCRIPT_DIR"/.env.example "$INSTALL_DIR/" 2>/dev/null || true
    cp "$SCRIPT_DIR"/.gitignore "$INSTALL_DIR/" 2>/dev/null || true
  fi
fi

# Create data directory
mkdir -p "$INSTALL_DIR/data/configs"

# Detect server IP
echo -e "${GREEN}[3/5]${NC} Configuring..."
if [ -f .env ]; then
  source .env
fi

if [ -z "$SERVER_IP" ]; then
  SERVER_IP=$(curl -sf --connect-timeout 5 ifconfig.me || curl -sf --connect-timeout 5 api.ipify.org || echo "")
  if [ -z "$SERVER_IP" ]; then
    read -p "  Enter your server's public IP: " SERVER_IP
  else
    echo -e "  Detected IP: ${GREEN}${SERVER_IP}${NC}"
    read -p "  Use this IP? [Y/n] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
      read -p "  Enter your server's public IP: " SERVER_IP
    fi
  fi
fi

if [ -z "$JWT_SECRET" ]; then
  JWT_SECRET=$(openssl rand -hex 32)
fi

if [ -z "$PANEL_PORT" ]; then
  PANEL_PORT=8080
fi

# Write .env
cat > "$INSTALL_DIR/.env" << EOF
SERVER_IP=${SERVER_IP}
JWT_SECRET=${JWT_SECRET}
PANEL_PORT=${PANEL_PORT}
EOF

# Pull telemt-proxy image
echo -e "${GREEN}[4/5]${NC} Pulling proxy image..."
docker pull telemt-proxy-v3 2>/dev/null || echo "  Image telemt-proxy-v3 not on Docker Hub — make sure it's loaded locally"

# Build and start
echo -e "${GREEN}[5/5]${NC} Building and starting panel..."
docker compose build
docker compose up -d

# Wait for startup
echo -n "  Waiting for panel to start"
for i in $(seq 1 30); do
  if curl -sf http://localhost:${PANEL_PORT}/api/health > /dev/null 2>&1; then
    echo -e " ${GREEN}OK${NC}"
    break
  fi
  echo -n "."
  sleep 1
  if [ $i -eq 30 ]; then
    echo -e " ${RED}TIMEOUT${NC}"
    echo "  Check logs: docker compose -f ${INSTALL_DIR}/docker-compose.yml logs"
  fi
done

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  ${GREEN}Installation complete!${NC}                        ${CYAN}║${NC}"
echo -e "${CYAN}╠═══════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║${NC}                                               ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  Panel:  ${GREEN}http://${SERVER_IP}:${PANEL_PORT}${NC}"
echo -e "${CYAN}║${NC}  Login:  ${GREEN}admin / admin${NC}                        ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}                                               ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  ${RED}Change the default password after login!${NC}    ${CYAN}║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Proxy ports: ${GREEN}10000-20000${NC} (auto-assigned)"
echo -e "  Data dir:    ${GREEN}${INSTALL_DIR}/data/${NC}"
echo ""
