/**
 * Notifications screen — scrollable list of system notifications.
 */
import type { NotificationItem } from '../types';
import { ICONS } from '../utils/constants';
import { truncate, formatTime } from '../utils/text-formatter';

export interface NotificationsData {
  items: NotificationItem[];
  offset: number; // scroll position
  total: number;
  unread: number;
}

const ITEMS_PER_PAGE = 3; // Line 1 = header, lines 2-4 = items

export function renderNotifications(data: NotificationsData): string[] {
  const lines: string[] = [];

  // Line 1: Header
  lines.push(
    `NOTIFICATIONS  ${data.unread > 0 ? `${ICONS.ALERT} ${data.unread} new` : 'All read'}  ${data.offset + 1}-${Math.min(data.offset + ITEMS_PER_PAGE, data.total)}/${data.total}`
  );

  // Lines 2-4: Items
  const visible = data.items.slice(data.offset, data.offset + ITEMS_PER_PAGE);
  for (const item of visible) {
    const icon = notificationIcon(item.type);
    const msg = truncate(item.message, 30);
    const time = formatTime(item.timestamp);
    const unread = item.read ? ' ' : '*';
    lines.push(`${unread}${icon} ${time} ${msg}`);
  }

  return lines;
}

function notificationIcon(type: NotificationItem['type']): string {
  switch (type) {
    case 'info': return 'ℹ';
    case 'warn': return ICONS.ALERT;
    case 'error': return ICONS.ERROR;
    case 'success': return ICONS.OK;
  }
}
