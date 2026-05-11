#!/usr/bin/env bash
# Hermes G2 HUD — Start the gateway server
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SCRIPT_DIR"

# Activate venv if it exists
if [ -f ".venv/bin/activate" ]; then
  source .venv/bin/activate
else
  echo "Virtualenv not found. Run ./scripts/setup.sh first."
  exit 1
fi

# Start the gateway
echo "Starting Hermes WS Gateway on port ${HERMES_GATEWAY_PORT:-9090}..."
echo "API: http://localhost:${HERMES_GATEWAY_PORT:-9090}/api/status"
echo "WS:  ws://localhost:${HERMES_GATEWAY_PORT:-9090}/ws"
echo ""

exec python -m gateway "$@"
