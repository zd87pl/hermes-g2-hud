/** Notification store — in-memory with filtering and export */
import type { NotificationItem } from '../types';

const MAX_NOTIFICATIONS = 50;
const notifications: NotificationItem[] = [];

/** Add a notification, auto-trim to max size */
export function addNotification(item: NotificationItem): void {
  notifications.unshift(item);
  if (notifications.length > MAX_NOTIFICATIONS) {
    notifications.length = MAX_NOTIFICATIONS;
  }
}

/** Mark a notification as read */
export function markRead(id: string): void {
  const n = notifications.find((n) => n.id === id);
  if (n) n.read = true;
}

/** Mark all as read */
export function markAllRead(): void {
  for (const n of notifications) n.read = true;
}

/** Get notifications, optionally filtered */
export function getNotifications(filter?: {
  type?: NotificationItem['type'];
  read?: boolean;
  limit?: number;
}): NotificationItem[] {
  let result = [...notifications];

  if (filter?.type) result = result.filter((n) => n.type === filter!.type);
  if (filter?.read !== undefined) result = result.filter((n) => n.read === filter!.read);
  if (filter?.limit) result = result.slice(0, filter.limit);

  return result;
}

/** Get counts */
export function getStats(): { total: number; unread: number } {
  return {
    total: notifications.length,
    unread: notifications.filter((n) => !n.read).length,
  };
}

/** Clear all notifications */
export function clearAll(): void {
  notifications.length = 0;
}
