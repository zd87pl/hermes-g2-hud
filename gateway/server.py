"""Hermes WS Gateway — Async WebSocket + REST server.

Protocol:
  G2 Client → Server:
    {"type": "subscribe", "topics": ["agents", "notifications"]}
    {"type": "command", "id": "cmd_N", "command": {"action": "...", "params": {...}}}

  Server → G2 Client:
    {"type": "agent_update", "agent": {...}}
    {"type": "notification", "notification": {...}}
    {"type": "command_result", "commandId": "cmd_N", "result": "..."}

  REST API (for Hermes/hooks to push updates):
    POST /api/agents — upsert agent state
    POST /api/notifications — push notification
    GET  /api/status — health check
    POST /api/command-callback — receive command results
"""

import asyncio
import json
import logging
import uuid
from typing import Optional

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from gateway.agent_tracker import AgentTracker
from gateway.notification_store import NotificationStore
from gateway.command_handler import CommandHandler

logger = logging.getLogger("hermes-gateway")

# --- REST models ---

class AgentUpdate(BaseModel):
    id: str
    name: str
    status: str = "idle"  # idle, busy, error, offline
    task: str = ""
    progress: int = 0
    last_active: Optional[int] = None
    error: Optional[str] = None

class NotificationPush(BaseModel):
    type: str = "info"  # info, warn, error, success
    message: str
    agent_id: Optional[str] = None

class CommandResult(BaseModel):
    command_id: str
    result: str

class HealthStatus(BaseModel):
    status: str
    connected_clients: int
    agent_count: int


# --- Server ---

class HermesGateway:
    """Manages WS connections, agent state, notifications, and commands."""

    def __init__(self, command_callback_url: str = ""):
        self.app = FastAPI(title="Hermes WS Gateway", version="1.0.0")
        self.agents = AgentTracker()
        self.notifications = NotificationStore()
        self.commands = CommandHandler(callback_url=command_callback_url)
        self.clients: set[WebSocket] = set()
        self._setup_routes()

    def _setup_routes(self):
        # CORS — allow all origins for dev, restrict in production
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_methods=["*"],
            allow_headers=["*"],
        )

        # WebSocket endpoint
        @self.app.websocket("/ws")
        async def ws_endpoint(ws: WebSocket):
            await ws.accept()
            self.clients.add(ws)
            logger.info(f"Client connected ({len(self.clients)} total)")

            # Send current state snapshot
            await self._send_snapshot(ws)

            try:
                while True:
                    data = await ws.receive_text()
                    await self._handle_message(ws, data)
            except WebSocketDisconnect:
                pass
            except Exception as e:
                logger.error(f"WS error: {e}")
            finally:
                self.clients.discard(ws)
                logger.info(f"Client disconnected ({len(self.clients)} total)")

        # REST: Push agent update from Hermes
        @self.app.post("/api/agents")
        async def push_agent(update: AgentUpdate):
            agent = self.agents.upsert(update.model_dump())
            await self._broadcast({
                "type": "agent_update",
                "agent": agent,
            })
            return {"ok": True, "agent_id": agent["id"]}

        # REST: Push notification from Hermes
        @self.app.post("/api/notifications")
        async def push_notification(notif: NotificationPush):
            item = self.notifications.add(notif.model_dump())
            await self._broadcast({
                "type": "notification",
                "notification": item,
            })
            return {"ok": True, "notification_id": item["id"]}

        # REST: Command result callback from Hermes
        @self.app.post("/api/command-callback")
        async def command_callback(result: CommandResult):
            await self._broadcast({
                "type": "command_result",
                "commandId": result.command_id,
                "result": result.result,
            })
            return {"ok": True}

        # REST: Health check
        @self.app.get("/api/status")
        async def health():
            return HealthStatus(
                status="ok",
                connected_clients=len(self.clients),
                agent_count=len(self.agents.get_all()),
            )

        # REST: Get all agents (for dashboard)
        @self.app.get("/api/agents")
        async def get_agents():
            return self.agents.get_all()

        # REST: Get all notifications
        @self.app.get("/api/notifications")
        async def get_notifications():
            return self.notifications.get_all()

    async def _broadcast(self, message: dict):
        """Send a message to all connected G2 clients."""
        payload = json.dumps(message)
        dead: list[WebSocket] = []
        for client in self.clients:
            try:
                await client.send_text(payload)
            except Exception:
                dead.append(client)
        for client in dead:
            self.clients.discard(client)

    async def _send_snapshot(self, ws: WebSocket):
        """Send current state to newly connected client."""
        for agent in self.agents.get_all():
            await ws.send_text(json.dumps({
                "type": "agent_update",
                "agent": agent,
            }))
        for notif in self.notifications.get_all()[-20:]:
            await ws.send_text(json.dumps({
                "type": "notification",
                "notification": notif,
            }))

    async def _handle_message(self, ws: WebSocket, raw: str):
        """Handle incoming WS message from G2 client."""
        try:
            msg = json.loads(raw)
        except json.JSONDecodeError:
            return

        msg_type = msg.get("type", "")

        if msg_type == "subscribe":
            # Already subscribed by default — send snapshot
            await self._send_snapshot(ws)

        elif msg_type == "command":
            cmd_id = msg.get("id", str(uuid.uuid4()))
            command = msg.get("command", {})
            action = command.get("action", "")
            params = command.get("params", {})

            logger.info(f"Command from G2: {action} (id={cmd_id})")

            # Handle built-in commands locally
            if action == "agent_status":
                agents = self.agents.get_all()
                result = json.dumps(agents, indent=2)
                await ws.send_text(json.dumps({
                    "type": "command_result",
                    "commandId": cmd_id,
                    "result": result,
                }))

            elif action == "notifications":
                notifs = self.notifications.get_all()
                result = json.dumps(notifs, indent=2)
                await ws.send_text(json.dumps({
                    "type": "command_result",
                    "commandId": cmd_id,
                    "result": result,
                }))

            else:
                # Forward to external command handler
                try:
                    result = await self.commands.dispatch(cmd_id, action, params)
                    await ws.send_text(json.dumps({
                        "type": "command_result",
                        "commandId": cmd_id,
                        "result": result,
                    }))
                except Exception as e:
                    logger.error(f"Command dispatch error: {e}")
                    await ws.send_text(json.dumps({
                        "type": "command_result",
                        "commandId": cmd_id,
                        "result": f"Error: {str(e)}",
                    }))


def create_app(command_callback_url: str = "") -> FastAPI:
    """Create the FastAPI app for programmatic use."""
    gateway = HermesGateway(command_callback_url=command_callback_url)
    return gateway.app
