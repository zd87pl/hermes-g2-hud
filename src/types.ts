/** Type definitions for Hermes G2 HUD */
import { AgentStatus } from './utils/constants';

export interface AgentState {
  id: string;
  name: string;
  status: AgentStatus;
  task: string;
  progress: number; // 0–100
  lastActive: number; // timestamp ms
  error?: string;
}

export interface AgentStats {
  total: number;
  idle: number;
  busy: number;
  error: number;
  offline: number;
}

export interface NotificationItem {
  id: string;
  type: 'info' | 'warn' | 'error' | 'success';
  message: string;
  timestamp: number;
  read: boolean;
  agentId?: string;
}

export interface HermesCommand {
  action: string;
  params?: Record<string, string>;
}

export interface HermesStatus {
  connected: boolean;
  agents: AgentStats;
  notifications: {
    total: number;
    unread: number;
  };
  recording: boolean;
}
