/** Display geometry for Even Realities G2 */
export const DISPLAY = {
  WIDTH: 576,
  HEIGHT: 288,
  LINES_VISIBLE: 10,
  CHARS_PER_LINE: 48,
  MAX_TEXT_CONTAINERS: 4,
} as const;

/** Screen identifiers */
export enum Screen {
  DASHBOARD = 0,
  AGENT_DETAIL = 1,
  NOTIFICATIONS = 2,
  QUICK_CMD = 3,
}

/** Agent status states */
export enum AgentStatus {
  IDLE = 'idle',
  BUSY = 'busy',
  ERROR = 'error',
  OFFLINE = 'offline',
}

/** Input actions from glasses touchpad */
export enum InputAction {
  TAP = 'tap',
  DOUBLE_TAP = 'double_tap',
  SCROLL_UP = 'scroll_up',
  SCROLL_DOWN = 'scroll_down',
}

/** Status icons for 4-bit greyscale display */
export const ICONS: Record<string, string> = {
  IDLE: '○',
  BUSY: '◉',
  ERROR: '⚠',
  OFFLINE: '✕',
  OK: '✓',
  PENDING: '⏳',
  ALERT: '⚡',
  CRON: '⏰',
  DEPLOY: '↗',
};
