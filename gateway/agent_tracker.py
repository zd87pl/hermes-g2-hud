"""Agent tracker — in-memory agent state management."""

import time
from typing import Optional


class AgentTracker:
    """Thread-safe agent state registry."""

    def __init__(self):
        self._agents: dict[str, dict] = {}

    def upsert(self, data: dict) -> dict:
        """Create or update an agent. Returns the stored agent dict."""
        agent_id = data["id"]
        now = int(time.time() * 1000)

        existing = self._agents.get(agent_id, {})
        agent = {
            **existing,
            **data,
            "last_active": data.get("last_active") or now,
        }

        # Ensure required fields have defaults
        agent.setdefault("status", "idle")
        agent.setdefault("task", "")
        agent.setdefault("progress", 0)

        self._agents[agent_id] = agent
        return agent

    def remove(self, agent_id: str) -> Optional[dict]:
        """Remove an agent. Returns removed agent or None."""
        return self._agents.pop(agent_id, None)

    def get(self, agent_id: str) -> Optional[dict]:
        """Get agent by ID."""
        return self._agents.get(agent_id)

    def get_all(self) -> list[dict]:
        """Get all agents, sorted by last active (most recent first)."""
        return sorted(
            self._agents.values(),
            key=lambda a: a.get("last_active", 0),
            reverse=True,
        )

    def mark_offline(self, threshold_ms: int = 120_000):
        """Mark agents as offline if inactive for too long."""
        now = int(time.time() * 1000)
        for agent in self._agents.values():
            if now - agent.get("last_active", 0) > threshold_ms:
                agent["status"] = "offline"

    def get_stats(self) -> dict:
        """Get aggregate agent statistics."""
        all_agents = list(self._agents.values())
        statuses = {"idle": 0, "busy": 0, "error": 0, "offline": 0}
        for a in all_agents:
            s = a.get("status", "idle")
            if s in statuses:
                statuses[s] += 1

        return {
            "total": len(all_agents),
            **statuses,
        }
