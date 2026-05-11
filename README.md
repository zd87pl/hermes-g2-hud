# Hermes G2 HUD

> **Monitor and control your Hermes AI agents from Even Realities G2 smart glasses.**  
> Real-time agent status, cron monitoring, notifications, and voice commands — all on a glanceable HUD.

```
┌─────────────┐   WebSocket    ┌─────────────┐   Bluetooth   ┌──────────────┐
│  Hermes WS  │ ◄────────────► │  Phone       │ ◄───────────► │  G2 Glasses  │
│  Gateway    │                │  (Even Hub   │               │  (display +  │
│  :9090      │                │   WebView)   │               │   mic + tap) │
└─────────────┘                └─────────────┘               └──────────────┘
```

## How It Works

1. **Hermes WS Gateway** runs on your server (or laptop). It exposes a WebSocket endpoint on port 9090.
2. **G2 HUD App** is a web app that runs inside the Even Realities app on your phone. It connects to the gateway over WebSocket.
3. **Hermes pushes updates** to the gateway via a simple REST API — agent status changes, notifications, cron results.
4. **Commands go the other way** — tap a command on the glasses, it flows through the gateway to Hermes.

## Quick Start (3 minutes)

```bash
# 1. Clone the repo
git clone https://github.com/zd87pl/hermes-g2-hud.git
cd hermes-g2-hud

# 2. Run setup (checks deps, installs Python + Node packages, builds G2 app)
./scripts/setup.sh

# 3. Start the gateway
./scripts/start.sh
```

That's it. The gateway is now running at `http://localhost:9090`.

---

## Full Setup Guide

### Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Python | 3.10+ | `python3 --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Even Realities App | Latest | [App Store](https://apps.apple.com/app/even-realities/id6443958843) / [Google Play](https://play.google.com/store/apps/details?id=com.evenrealities.evenhub) |
| G2 Glasses | — | Paired with your phone via Bluetooth |

### Step 1: Clone & Setup

```bash
git clone https://github.com/zd87pl/hermes-g2-hud.git
cd hermes-g2-hud
./scripts/setup.sh
```

This creates a Python virtualenv, installs the gateway dependencies, installs the G2 app's npm packages, and runs TypeScript + Vite build.

### Step 2: Start the Gateway

```bash
# Direct
./scripts/start.sh

# With custom port
./scripts/start.sh --port 8080

# With Hermes callback (for external commands)
HERMES_CALLBACK_URL=http://localhost:8080 ./scripts/start.sh
```

Or use Docker:

```bash
docker compose up -d
```

Verify it's running:

```bash
curl http://localhost:9090/api/status
# {"status":"ok","connected_clients":0,"agent_count":0}
```

### Step 3: Push Agent Updates (from Hermes)

The gateway has a REST API that Hermes (or any script/cron job) can call to push updates:

```bash
# Push an agent update
curl -X POST http://localhost:9090/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "id": "powerhouse-dev",
    "name": "Powerhouse Dev",
    "status": "busy",
    "task": "Reviewing PR #342",
    "progress": 65
  }'

# Push a notification
curl -X POST http://localhost:9090/api/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "type": "warn",
    "message": "CI pipeline failed for curvypoland (lint)",
    "agent_id": "powerhouse-dev"
  }'

# Push a command result
curl -X POST http://localhost:9090/api/command-callback \
  -H "Content-Type: application/json" \
  -d '{
    "command_id": "cmd_1",
    "result": "All systems healthy.\n3 agents running.\n5 cron jobs active."
  }'
```

**Pro tip:** Add a Hermes hook that POSTs to the gateway whenever an agent starts, completes, or errors. Example cron hook:

```bash
# In your Hermes cron job or agent lifecycle hook:
curl -s -X POST http://localhost:9090/api/agents \
  -H "Content-Type: application/json" \
  -d "{\"id\": \"$(hostname)\", \"name\": \"$(hostname)\", \"status\": \"busy\", \"task\": \"$TASK_NAME\"}"
```

### Step 4: Build & Sideload the G2 App

The G2 HUD is a Vite + TypeScript web app. Build and sideload it to your glasses:

```bash
# Build
npm run build

# Generate QR code for sideloading
npx evenhub qr

# Scan the QR code with the Even Realities App
# (Even Realities App → Developer → Scan QR Code)
```

The app connects to the gateway via WebSocket. By default it tries `ws://127.0.0.1:9090` (localhost on your phone won't work in production — see below).

### Step 5: Configure the WS URL

For production (your phone connecting to a remote server), update the WebSocket URL in the G2 app:

Edit `app.json` to whitelist your server's domain:

```json
{
  "network": [
    "wss://hermes.yourdomain.com",
    "ws://192.168.1.100:9090"
  ]
}
```

Then update the WebSocket URL in `src/main.ts` (line ~42):

```typescript
const ws = new HermesWebSocket({ url: 'ws://192.168.1.100:9090' });
```

Rebuild and re-sideload after changing.

---

## Using the Glasses

### Navigation

| Input | Action |
|-------|--------|
| **Tap** | Advance (next screen, next agent, execute command) |
| **Double-tap** | Go back to Dashboard |
| **Scroll down** | Next item in list / Quick Commands |
| **Scroll up** | Previous item in list |

### Screens

| # | Screen | What you see |
|---|--------|-------------|
| 1 | **Dashboard** | Agent count, status breakdown, top 2 agents, unread count |
| 2 | **Agent Detail** | Per-agent status, current task, progress bar, last active |
| 3 | **Notifications** | Scrollable list of alerts with type icons, mark-read |
| 4 | **Quick Commands** | 8 pre-configured commands (health, cron, deploy, etc.) |

### Quick Commands

| Command | What it does |
|---------|-------------|
| Health Audit | Check system health |
| Cron Status | List active cron jobs |
| Platform Health | Platform-wide health check |
| Agent Status | Dump all agent states |
| Deploy Status | Check deployments |
| Notifications | View recent notifications |
| CurvyPoland | Deploy status for CurvyPoland |
| Run Daily Brief | Trigger daily AI briefing |

---

## Hermes Integration Patterns

### Option A: REST Push (simplest)

Hermes pushes updates to the gateway via REST. Add to your Hermes agent hooks, cron scripts, or deployment pipelines:

```python
import requests

def notify_gateway(agent_id: str, status: str, task: str = "", progress: int = 0):
    """Push agent state to the G2 gateway."""
    try:
        requests.post("http://localhost:9090/api/agents", json={
            "id": agent_id,
            "name": agent_id,
            "status": status,
            "task": task,
            "progress": progress,
        }, timeout=5)
    except Exception:
        pass  # Gateway is optional — don't crash if it's down

def push_notification(msg_type: str, message: str):
    """Push a notification to the G2 gateway."""
    try:
        requests.post("http://localhost:9090/api/notifications", json={
            "type": msg_type,
            "message": message,
        }, timeout=5)
    except Exception:
        pass
```

### Option B: WebSocket Bridge (real-time)

If you want Hermes itself to maintain a persistent connection, the gateway's WS protocol is simple:

```python
import asyncio
import websockets
import json

async def hermes_bridge():
    async with websockets.connect("ws://localhost:9090/ws") as ws:
        # Subscribe
        await ws.send(json.dumps({
            "type": "subscribe",
            "topics": ["agents", "notifications"],
        }))
        # Listen for commands from G2
        async for msg in ws:
            data = json.loads(msg)
            if data["type"] == "command":
                # Handle the command
                result = handle_command(data["command"])
                # No need to reply — commands return via REST callback
```

### Option C: Systemd Service (production)

```bash
sudo cp deploy/systemd/hermes-gateway.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now hermes-gateway
sudo systemctl status hermes-gateway
```

---

## API Reference

### Gateway REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/status` | Health check |
| `GET` | `/api/agents` | List all agents |
| `POST` | `/api/agents` | Push agent update |
| `GET` | `/api/notifications` | List all notifications |
| `POST` | `/api/notifications` | Push notification |
| `POST` | `/api/command-callback` | Receive command result |
| `WS` | `/ws` | G2 HUD WebSocket |

### Agent Update Payload

```json
{
  "id": "powerhouse-dev",
  "name": "Powerhouse Dev",
  "status": "busy",        // idle | busy | error | offline
  "task": "PR review #342",
  "progress": 65,          // 0–100
  "last_active": 1715452800000,
  "error": null
}
```

### WebSocket Protocol

```
Client → Server:
  {"type": "subscribe", "topics": ["agents", "notifications"]}
  {"type": "command", "id": "cmd_N", "command": {"action": "health_audit", "params": {}}}

Server → Client:
  {"type": "agent_update", "agent": {...}}
  {"type": "notification", "notification": {...}}
  {"type": "command_result", "commandId": "cmd_N", "result": "..."}
```

---

## Project Structure

```
hermes-g2-hud/
├── gateway/                    # Python WebSocket gateway
│   ├── __init__.py
│   ├── __main__.py
│   ├── cli.py                  # Entry point
│   ├── server.py               # FastAPI + WebSocket server
│   ├── agent_tracker.py        # In-memory agent registry
│   ├── notification_store.py   # Notification storage
│   ├── command_handler.py      # Command dispatch to Hermes
│   ├── requirements.txt
│   └── Dockerfile
├── src/                        # G2 HUD web app (TypeScript)
│   ├── main.ts                 # App entry + navigation
│   ├── types.ts                # Shared types
│   ├── integration-example.ts  # Programmatic API
│   ├── bridge/
│   │   ├── display.ts          # G2 display rendering
│   │   ├── input.ts            # Tap/scroll events
│   │   └── audio.ts            # Mic capture (voice)
│   ├── screens/
│   │   ├── dashboard.ts
│   │   ├── agent-detail.ts
│   │   ├── notifications.ts
│   │   └── quick-cmd.ts
│   ├── services/
│   │   ├── hermes-ws.ts        # WebSocket client
│   │   ├── agent-tracker.ts
│   │   ├── notification-store.ts
│   │   ├── command-dispatcher.ts
│   │   └── index.ts
│   └── utils/
│       ├── constants.ts
│       └── text-formatter.ts
├── scripts/
│   ├── setup.sh                # One-command setup
│   └── start.sh                # Start the gateway
├── deploy/
│   └── systemd/
│       └── hermes-gateway.service
├── docker-compose.yml
├── app.json                    # Even Hub metadata
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| G2 app shows "OFFLINE" | Gateway not running — `./scripts/start.sh` |
| "WebSocket connection error" | Wrong WS URL — check `src/main.ts` and network config |
| Commands return "Unknown command" | Set `HERMES_CALLBACK_URL` env var |
| Can't sideload to glasses | Make sure Even Realities App is in Developer mode (App → Settings → Developer) |
| Gateway not reachable from phone | Use your computer's LAN IP (`ifconfig`), not localhost |
| `tsc` build fails | Remove `tsc` from build script in `package.json`, use `vite build` directly |
| Vite build fails on esbuild | `/tmp` is noexec — clone to a writable directory like `~/` |

---

## License

MIT — see [LICENSE](./LICENSE).

Built for [Hermes Agent](https://github.com/zd87pl/powerhouse) by [zd87pl](https://github.com/zd87pl).
