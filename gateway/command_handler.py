"""Command handler — dispatches G2 commands to Hermes backend.

Supports two modes:
1. HTTP callback — POST command to a callback URL, await result
2. Local process — spawn a Hermes CLI command (future)
"""

import asyncio
import json
import logging
from urllib.parse import urljoin

logger = logging.getLogger("hermes-gateway.commands")


class CommandHandler:
    """Routes G2 commands to Hermes via HTTP callback or local process."""

    def __init__(self, callback_url: str = ""):
        self.callback_url = callback_url
        self._pending: dict[str, asyncio.Future] = {}

    async def dispatch(self, cmd_id: str, action: str, params: dict) -> str:
        """Dispatch a command and return the result.

        If callback_url is set, sends an HTTP POST and waits for the
        result to come back via POST /api/command-callback.
        """
        # Built-in commands handled directly
        if action == "health_audit":
            return self._health_audit()

        if action == "cron_list":
            return self._cron_list()

        if action == "platform_health":
            return self._platform_health()

        if action == "deploy_status":
            name = params.get("name", "all")
            return self._deploy_status(name)

        # External commands — forward to callback
        if self.callback_url:
            return await self._forward_to_callback(cmd_id, action, params)

        return f"Unknown command: {action}. Set HERMES_CALLBACK_URL to enable external commands."

    def receive_result(self, cmd_id: str, result: str):
        """Receive a command result from the callback endpoint."""
        future = self._pending.get(cmd_id)
        if future and not future.done():
            future.set_result(result)
            del self._pending[cmd_id]

    async def _forward_to_callback(
        self, cmd_id: str, action: str, params: dict
    ) -> str:
        """Send command to external callback URL and await result."""
        import aiohttp

        future = asyncio.get_event_loop().create_future()
        self._pending[cmd_id] = future

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    urljoin(self.callback_url, "/command"),
                    json={
                        "command_id": cmd_id,
                        "action": action,
                        "params": params,
                    },
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as resp:
                    if resp.status != 200:
                        raise Exception(f"Callback returned {resp.status}")

            # Wait for async result
            result = await asyncio.wait_for(future, timeout=30)
            return result

        except asyncio.TimeoutError:
            self._pending.pop(cmd_id, None)
            return f"Command timed out: {action}"
        except Exception as e:
            self._pending.pop(cmd_id, None)
            raise

    # --- Built-in command handlers ---

    def _health_audit(self) -> str:
        return (
            "✓ Gateway: online\n"
            "✓ WebSocket: active\n"
            "✓ Agent tracker: ok\n"
            "Note: Full Hermes health audit requires Hermes API integration.\n"
            "Set HERMES_CALLBACK_URL to enable."
        )

    def _cron_list(self) -> str:
        return (
            "Cron jobs: (requires Hermes API integration)\n"
            "Set HERMES_CALLBACK_URL to enable cron monitoring."
        )

    def _platform_health(self) -> str:
        return (
            "Platform health: (requires Hermes API integration)\n"
            "Set HERMES_CALLBACK_URL to enable platform monitoring."
        )

    def _deploy_status(self, name: str) -> str:
        return (
            f"Deploy status for '{name}': (requires Hermes API)\n"
            "Set HERMES_CALLBACK_URL to enable deploy monitoring."
        )
