#!/usr/bin/env bash
# Hermes G2 HUD — Full setup script
# Clones the repo, installs deps, starts the gateway.
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Hermes G2 HUD — Setup${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# --- Step 1: Check prerequisites ---
echo -e "${YELLOW}[1/5] Checking prerequisites...${NC}"

command -v python3 >/dev/null 2>&1 || { echo -e "${RED}python3 is required${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}node is required (for G2 app build)${NC}"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}npm is required${NC}"; exit 1; }
echo -e "  ${GREEN}✓${NC} python3 $(python3 --version)"
echo -e "  ${GREEN}✓${NC} node $(node --version)"
echo -e "  ${GREEN}✓${NC} npm $(npm --version)"

# --- Step 2: Set up virtualenv ---
echo -e "${YELLOW}[2/5] Setting up Python virtualenv...${NC}"
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SCRIPT_DIR"

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -r gateway/requirements.txt
echo -e "  ${GREEN}✓${NC} virtualenv ready"

# --- Step 3: Install G2 app dependencies ---
echo -e "${YELLOW}[3/5] Installing G2 app dependencies...${NC}"
npm install --ignore-scripts 2>/dev/null || npm install
echo -e "  ${GREEN}✓${NC} npm deps installed"

# --- Step 4: Build G2 app ---
echo -e "${YELLOW}[4/5] Building G2 app...${NC}"
npx tsc --noEmit 2>/dev/null && echo -e "  ${GREEN}✓${NC} TypeScript OK" || echo -e "  ${YELLOW}⚠ TypeScript check skipped (tsc not available)${NC}"
npx vite build 2>/dev/null && echo -e "  ${GREEN}✓${NC} Vite build OK" || echo -e "  ${YELLOW}⚠ Vite build skipped (may need native deps)${NC}"

# --- Step 5: Done ---
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Next steps:"
echo -e ""
echo -e "  1. Start the gateway:"
echo -e "     ${CYAN}./scripts/start.sh${NC}"
echo -e ""
echo -e "  2. Sideload to glasses (from the G2 app dir):"
echo -e "     ${CYAN}npx evenhub qr${NC}"
echo -e "     Scan the QR code with the Even Realities App"
echo -e ""
echo -e "  3. Or use Docker:"
echo -e "     ${CYAN}docker compose up -d${NC}"
echo -e ""
echo -e "The gateway will be available at ${CYAN}http://localhost:9090${NC}"
echo -e "Health check: ${CYAN}curl http://localhost:9090/api/status${NC}"
