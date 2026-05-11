/**
 * Dashboard screen — overview of all Hermes agents and system status.
 * Lines: agent count, status breakdown, top agent, connection status.
 */
import type { AgentState, NotificationItem } from '../types';
import { ICONS, AgentStatus } from '../utils/constants';
import { kvLine, truncate, formatTime } from '../utils/text-formatter';

export interface DashboardData {
  agents: AgentState[];
  total: number;
  idle: number;
  busy: number;
  error: number;
  offline: number;
  connected: boolean;
  unreadNotifications: number;
}

export function renderDashboard(data: DashboardData): string[] {
  const lines: string[] = [];

  // Line 1: Title + connection status
  const connIcon = data.connected ? ICONS.OK : ICONS.OFFLINE;
  const connText = data.connected ? 'ONLINE' : 'OFFLINE';
  lines.push(`HERMES G2 HUD        ${connIcon} ${connText}`);

  // Line 2: Agent counts
  const agentLine = [
    `Agents:${data.total}`,
    `${ICONS.IDLE}${data.idle}`,
    `${ICONS.BUSY}${data.busy}`,
    `${ICONS.ERROR}${data.error}`,
    `${ICONS.OFFLINE}${data.offline}`,
  ].join('  ');
  lines.push(agentLine);

  // Lines 3-4: Top 2 agents
  const top = data.agents.slice(0, 2);
  for (const agent of top) {
    const icon = statusIcon(agent.status);
    const name = truncate(agent.name, 12);
    const task = truncate(agent.task || '(idle)', 20);
    const time = formatTime(agent.lastActive);
    lines.push(`${icon} ${name} ${task} ${time}`);
  }

  // If we have space and unread notifications
  if (data.unreadNotifications > 0 && lines.length < 4) {
    lines.push(`${ICONS.ALERT} ${data.unreadNotifications} unread notifications`);
  }

  return lines;
}

function statusIcon(status: AgentStatus): string {
  switch (status) {
    case AgentStatus.IDLE: return ICONS.IDLE;
    case AgentStatus.BUSY: return ICONS.BUSY;
    case AgentStatus.ERROR: return ICONS.ERROR;
    case AgentStatus.OFFLINE: return ICONS.OFFLINE;
  }
}
