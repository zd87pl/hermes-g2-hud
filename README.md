# Hermes G2 HUD

**Agent monitoring and control for Hermes AI on Even Realities G2 smart glasses.**

Real-time WebSocket-powered HUD that lets you monitor agents, check cron jobs, review notifications, and dispatch commands — all from your glasses. Tap/scroll navigation, four-screen layout, and voice command support via the G2 microphone array.

## Architecture

```
┌─────────────┐   WebSocket    ┌─────────────┐   Bluetooth   ┌──────────────┐
│  Hermes API │ ◄────────────► │  Phone       │ ◄───────────► │  G2 Glasses  │
│  (ws://)    │                │  (WebView)   │               │  (display +  │
└─────────────┘                └─────────────┘               │   input)     │
                                                              └──────────────┘
```

- **Even Hub SDK** bridges WebView ↔ Glasses (display, mic, touchpad)
- **Hermes WebSocket** connects to your Hermes backend for real-time agent data
- **Four screens**: Dashboard → Agent Detail → Notifications → Quick Commands
- **Voice capture**: G2 4-mic array → PCM audio for STT pipelines

## Screens

| Screen | Tap | Double-tap | Scroll |
|--------|-----|-----------|--------|
| Dashboard | Agent detail | Notifications | Quick Commands |
| Agent Detail | Next agent | Back to dashboard | — |
| Notifications | Mark read | Back to dashboard | Scroll list |
| Quick Commands | Execute selected | Back to dashboard | Select command |

## Quick Commands

Pre-configured commands dispatched to Hermes via WebSocket:

- Health Audit
- Cron Status
- Platform Health
- Agent Status
- Deploy Status
- Notifications
- CurvyPoland (deploy status)
- Run Daily Brief

## Development

```bash
npm install        # Install dependencies
npm run dev        # Vite dev server on :5173
npm run build      # Production build (tsc + vite)
npm run preview    # Preview production build
```

### Sideloading to Glasses

```bash
npx evenhub pack                    # Package for Even Hub
# OR
npx evenhub qr                      # Generate QR code for direct sideload
# Scan QR with Even Realities App
```

## Hermes Backend

The HUD expects a Hermes WebSocket gateway at `ws://127.0.0.1:9090` with this protocol:

### Client → Server

```json
{ "type": "subscribe", "topics": ["agents", "notifications"] }
{ "type": "command", "id": "cmd_1", "command": { "action": "health_audit" } }
```

### Server → Client

```json
{ "type": "agent_update", "agent": { "id": "...", "name": "...", "status": "busy", ... } }
{ "type": "notification", "notification": { "id": "...", "type": "info", "message": "..." } }
{ "type": "command_result", "commandId": "cmd_1", "result": "All systems healthy" }
```

## Project Structure

```
src/
├── main.ts                 # App entry point
├── types.ts                # Shared types
├── integration-example.ts  # Programmatic API
├── bridge/
│   ├── display.ts          # G2 display rendering
│   ├── input.ts            # Tap/scroll event handling
│   └── audio.ts            # Microphone capture
├── screens/
│   ├── dashboard.ts        # Agent overview
│   ├── agent-detail.ts     # Per-agent status
│   ├── notifications.ts    # Scrollable alert list
│   └── quick-cmd.ts        # Command palette
├── services/
│   ├── hermes-ws.ts        # WebSocket client
│   ├── agent-tracker.ts    # Agent state management
│   ├── notification-store.ts
│   ├── command-dispatcher.ts
│   └── index.ts
└── utils/
    ├── constants.ts        # Display config, icons
    └── text-formatter.ts   # Text formatting utilities
```

## License

MIT — see [LICENSE](./LICENSE).

---

Built for [Hermes Agent](https://github.com/zd87pl/powerhouse) by [zd87pl](https://github.com/zd87pl).
