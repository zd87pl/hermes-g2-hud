/** Command dispatcher — sends commands to Hermes backend */
import { HermesWebSocket } from './hermes-ws';
import type { HermesCommand } from '../types';

const wsRef: { current: HermesWebSocket | null } = { current: null };

/** Initialize with a WebSocket instance */
export function initDispatcher(ws: HermesWebSocket): void {
  wsRef.current = ws;
}

/** Run a health audit */
export async function runHealthAudit(): Promise<string> {
  return dispatch({ action: 'health_audit' });
}

/** Get status of a specific deployment */
export async function getDeployStatus(name: string): Promise<string> {
  return dispatch({ action: 'deploy_status', params: { name } });
}

/** List active cron jobs */
export async function listCronJobs(): Promise<string> {
  return dispatch({ action: 'cron_list' });
}

/** Run a cron job immediately */
export async function runCronJob(name: string): Promise<string> {
  return dispatch({ action: 'cron_run', params: { name } });
}

/** Get platform health summary */
export async function getPlatformHealth(): Promise<string> {
  return dispatch({ action: 'platform_health' });
}

/** Send a custom command */
export async function dispatch(command: HermesCommand): Promise<string> {
  if (!wsRef.current || !wsRef.current.connected) {
    throw new Error('Not connected to Hermes');
  }
  return wsRef.current.sendCommand(command);
}

/** Predefined quick commands for the G2 menu */
export const QUICK_COMMANDS: { label: string; command: HermesCommand }[] = [
  { label: 'Health Audit', command: { action: 'health_audit' } },
  { label: 'Cron Status', command: { action: 'cron_list' } },
  { label: 'Platform Health', command: { action: 'platform_health' } },
  { label: 'Agent Status', command: { action: 'agent_status' } },
  { label: 'Deploy Status', command: { action: 'deploy_status' } },
  { label: 'Notifications', command: { action: 'notifications' } },
  { label: 'CurvyPoland', command: { action: 'deploy_status', params: { name: 'curvypoland' } } },
  { label: 'Run Daily Brief', command: { action: 'cron_run', params: { name: 'daily-brief' } } },
];
