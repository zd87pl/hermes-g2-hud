/**
 * Agent Detail screen — per-agent status, current task, progress.
 */
import type { AgentState } from '../types';
import { ICONS, AgentStatus, DISPLAY } from '../utils/constants';
import { truncate, progressBar, formatTime } from '../utils/text-formatter';

export function renderAgentDetail(agent: AgentState): string[] {
  const lines: string[] = [];
  const icon = statusIcon(agent.status);

  // Line 1: Agent name + status
  lines.push(`${icon} ${truncate(agent.name, 30)} ${agent.status.toUpperCase()}`);

  // Line 2: Current task
  lines.push(`Task: ${truncate(agent.task || '(none)', 40)}`);

  // Line 3: Progress bar
  lines.push(progressBar(agent.progress || 0, 32));

  // Line 4: Error or last active
  if (agent.error) {
    lines.push(`${ICONS.ALERT} ${truncate(agent.error, 40)}`);
  } else {
    lines.push(`Active: ${formatTime(agent.lastActive)}`);
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
