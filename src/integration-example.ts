/**
 * Integration example — shows how to use Hermes G2 HUD programmatically.
 * This is a reference for embedding the HUD in other apps.
 */
import { HermesWebSocket } from './services/hermes-ws';
import {
  upsertAgent,
  getAgents,
  getAgentStats,
  getAgent,
} from './services/agent-tracker';
import {
  addNotification,
  getNotifications,
  getNotificationStats,
  markAllRead,
} from './services/notification-store';
import {
  initDispatcher,
  runHealthAudit,
  getDeployStatus,
  listCronJobs,
  runCronJob,
  getPlatformHealth,
  dispatch,
  QUICK_COMMANDS,
} from './services/command-dispatcher';
import { initAudio, startRecording, stopRecording, isRecording } from './bridge/audio';
import type { HermesStatus } from './types';

let ws: HermesWebSocket | null = null;

/** Initialize the full HUD with Hermes backend connection */
export async function initializeHermesHUD(
  wsUrl: string = 'ws://127.0.0.1:9090'
): Promise<void> {
  ws = new HermesWebSocket({ url: wsUrl });
  initDispatcher(ws);

  ws.on((event) => {
    switch (event.type) {
      case 'agent_update':
        upsertAgent(event.agent);
        break;
      case 'notification':
        addNotification(event.notification);
        break;
    }
  });

  ws.connect();
  await initAudio();
}

/** Get current HUD status snapshot */
export function getHUDStatus(): HermesStatus {
  const agentStats = getAgentStats();
  const notifStats = getNotificationStats();

  return {
    connected: ws?.connected ?? false,
    agents: agentStats,
    notifications: {
      total: notifStats.total,
      unread: notifStats.unread,
    },
    recording: isRecording(),
  };
}

/** Subscribe to a specific agent */
export async function subscribeToAgent(agentId: string): Promise<void> {
  if (!ws) throw new Error('HUD not initialized');
  // Send subscription via WS
  await dispatch({ action: 'subscribe_agent', params: { id: agentId } });
}

/** Send a message to an agent */
export async function sendMessageToAgent(
  agentId: string,
  message: string
): Promise<string> {
  if (!ws) throw new Error('HUD not initialized');
  return dispatch({ action: 'send_message', params: { id: agentId, message } });
}

/** Start voice recording from G2 mic */
export async function startVoiceRecording(): Promise<void> {
  await startRecording();
}

/** Stop voice recording and get PCM data */
export async function stopVoiceRecording(): Promise<Uint8Array> {
  return stopRecording();
}

export {
  // Agent tracker
  getAgents,
  getAgentStats,
  getAgent,
  // Notifications
  getNotifications,
  getNotificationStats,
  markAllRead,
  // Commands
  runHealthAudit,
  getDeployStatus,
  listCronJobs,
  runCronJob,
  getPlatformHealth,
  dispatch,
  QUICK_COMMANDS,
  // Types
  HermesWebSocket,
  type HermesStatus,
};
