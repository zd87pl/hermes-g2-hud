"""Notification store — in-memory with auto-trim."""

import time
import uuid


class NotificationStore:
    """In-memory notification storage with auto-trim."""

    def __init__(self, max_size: int = 100):
        self._notifications: list[dict] = []
        self._max_size = max_size

    def add(self, data: dict) -> dict:
        """Add a notification. Returns the stored item."""
        item = {
            "id": str(uuid.uuid4())[:8],
            "type": data.get("type", "info"),
            "message": data.get("message", ""),
            "timestamp": int(time.time() * 1000),
            "read": False,
            "agent_id": data.get("agent_id"),
        }
        self._notifications.insert(0, item)

        # Trim to max size
        if len(self._notifications) > self._max_size:
            self._notifications = self._notifications[: self._max_size]

        return item

    def get_all(self) -> list[dict]:
        """Get all notifications (newest first)."""
        return list(self._notifications)

    def get_unread(self) -> list[dict]:
        """Get unread notifications."""
        return [n for n in self._notifications if not n["read"]]

    def mark_read(self, notification_id: str):
        """Mark a notification as read."""
        for n in self._notifications:
            if n["id"] == notification_id:
                n["read"] = True
                break

    def mark_all_read(self):
        """Mark all notifications as read."""
        for n in self._notifications:
            n["read"] = True

    def get_stats(self) -> dict:
        """Get notification counts."""
        return {
            "total": len(self._notifications),
            "unread": len(self.get_unread()),
        }

    def clear(self):
        """Clear all notifications."""
        self._notifications.clear()
