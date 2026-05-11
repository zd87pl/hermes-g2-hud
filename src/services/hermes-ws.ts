/**
 * Hermes WebSocket client — connects to Hermes backend for
 * real-time agent monitoring, cron status, and command dispatch.
 */
import type { AgentState, NotificationItem, HermesCommand } from '../types';

export interface HermesWSOptions {
  url?: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectInterval?: number;
}

export type HermesEventCallback = (event: HermesEvent) => void;

export type HermesEvent =
  | { type: 'agent_update'; agent: AgentState }
  | { type: 'notification'; notification: NotificationItem }
  | { type: 'connected' }
  | { type: 'disconnected' }
  | { type: 'error'; message: string }
  | { type: 'command_result'; commandId: string; result: string };

const DEFAULT_OPTIONS: Required<HermesWSOptions> = {
  url: 'ws://127.0.0.1:9090',
  reconnect: true,
  reconnectInterval: 1000,
  maxReconnectInterval: 30000,
};

export class HermesWebSocket {
  private ws: WebSocket | null = null;
  private opts: Required<HermesWSOptions>;
  private listeners: HermesEventCallback[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private currentInterval: number;
  private commandIdCounter = 0;
  private pendingCommands: Map<string, {
    resolve: (result: string) => void;
    reject: (err: Error) => void;
  }> = new Map();

  constructor(options: HermesWSOptions = {}) {
    this.opts = { ...DEFAULT_OPTIONS, ...options };
    this.currentInterval = this.opts.reconnectInterval;
  }

  /** Connect to Hermes WebSocket gateway */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket(this.opts.url);

      this.ws.onopen = () => {
        this.currentInterval = this.opts.reconnectInterval;
        this.emit({ type: 'connected' });
        // Request full state snapshot
        this.send({ type: 'subscribe', topics: ['agents', 'notifications'] });
      };

      this.ws.onmessage = (msg: MessageEvent) => {
        try {
          const data = JSON.parse(msg.data);
          this.handleMessage(data);
        } catch (e) {
          console.error('Hermes WS parse error:', e);
        }
      };

      this.ws.onclose = () => {
        this.emit({ type: 'disconnected' });
        if (this.opts.reconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        this.emit({ type: 'error', message: 'WebSocket connection error' });
      };
    } catch (e) {
      this.emit({ type: 'error', message: `Connection failed: ${e}` });
      if (this.opts.reconnect) this.scheduleReconnect();
    }
  }

  /** Disconnect from Hermes */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  /** Send a Hermes command */
  sendCommand(command: HermesCommand): Promise<string> {
    const id = `cmd_${++this.commandIdCounter}`;
    return new Promise((resolve, reject) => {
      this.pendingCommands.set(id, { resolve, reject });
      this.send({ type: 'command', id, command });

      // Timeout after 30s
      setTimeout(() => {
        if (this.pendingCommands.has(id)) {
          this.pendingCommands.delete(id);
          reject(new Error('Command timed out'));
        }
      }, 30000);
    });
  }

  /** Subscribe to events */
  on(fn: HermesEventCallback): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  /** Get connection state */
  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // --- Private ---

  private send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private handleMessage(data: Record<string, unknown>): void {
    const msgType = data.type as string;

    switch (msgType) {
      case 'agent_update':
        this.emit({ type: 'agent_update', agent: data.agent as AgentState });
        break;
      case 'notification':
        this.emit({
          type: 'notification',
          notification: data.notification as NotificationItem,
        });
        break;
      case 'command_result': {
        const cmdId = data.commandId as string;
        const result = data.result as string;
        const pending = this.pendingCommands.get(cmdId);
        if (pending) {
          this.pendingCommands.delete(cmdId);
          pending.resolve(result);
        }
        this.emit({ type: 'command_result', commandId: cmdId, result });
        break;
      }
      case 'error':
        this.emit({ type: 'error', message: data.message as string });
        break;
    }
  }

  private emit(event: HermesEvent): void {
    for (const fn of this.listeners) {
      try { fn(event); } catch { /* swallow */ }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.emit({ type: 'error', message: `Reconnecting in ${this.currentInterval / 1000}s...` });

    this.reconnectTimer = setTimeout(() => {
      this.connect();
      // Exponential backoff
      this.currentInterval = Math.min(
        this.currentInterval * 2,
        this.opts.maxReconnectInterval
      );
    }, this.currentInterval);
  }
}
