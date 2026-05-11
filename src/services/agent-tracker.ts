/** Agent state tracker — in-memory agent registry with stats */
import type { AgentState, AgentStats } from '../types';
import { AgentStatus } from '../utils/constants';

const agents = new Map<string, AgentState>();

/** Update or insert an agent */
export function upsertAgent(agent: AgentState): void {
  agents.set(agent.id, { ...agent, lastActive: Date.now() });
}

/** Remove an agent */
export function removeAgent(id: string): void {
  agents.delete(id);
}

/** Get an agent by ID */
export function getAgent(id: string): AgentState | undefined {
  return agents.get(id);
}

/** Get all agents sorted by last active (most recent first) */
export function getAgents(): AgentState[] {
  return [...agents.values()].sort((a, b) => b.lastActive - a.lastActive);
}

/** Get top N agents for dashboard */
export function getTopAgents(n: number = 3): AgentState[] {
  return getAgents().slice(0, n);
}

/** Calculate agent statistics */
export function getAgentStats(): AgentStats {
  const all = [...agents.values()];
  const now = Date.now();
  const OFFLINE_THRESHOLD = 120_000; // 2 min

  return {
    total: all.length,
    idle: all.filter((a) => a.status === AgentStatus.IDLE).length,
    busy: all.filter((a) => a.status === AgentStatus.BUSY).length,
    error: all.filter((a) => a.status === AgentStatus.ERROR).length,
    offline: all.filter(
      (a) => now - a.lastActive > OFFLINE_THRESHOLD
    ).length,
  };
}

/** Mark agents as offline if inactive too long */
export function markOffline(): void {
  const now = Date.now();
  for (const [id, agent] of agents) {
    if (now - agent.lastActive > 120_000) {
      agents.set(id, { ...agent, status: AgentStatus.OFFLINE });
    }
  }
}
