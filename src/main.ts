/**
 * Hermes G2 HUD — Main entry point.
 *
 * Wire up the G2 display, input, audio bridges with the Hermes
 * WebSocket client. Four screens: Dashboard → Agent Detail →
 * Notifications → Quick Commands.
 */
import { initDisplay, render, clear } from './bridge/display';
import { initInput, setHandler } from './bridge/input';
import { initAudio, startRecording, stopRecording, isRecording } from './bridge/audio';
import { HermesWebSocket } from './services/hermes-ws';
import {
  upsertAgent,
  getAgents,
  getTopAgents,
  getAgentStats,
  getAgent,
  markOffline,
} from './services/agent-tracker';
import {
  addNotification,
  getNotifications,
  getNotificationStats,
  markAllRead,
} from './services/notification-store';
import { initDispatcher, QUICK_COMMANDS, dispatch } from './services/command-dispatcher';
import { renderDashboard } from './screens/dashboard';
import { renderAgentDetail } from './screens/agent-detail';
import { renderNotifications } from './screens/notifications';
import { renderQuickCmd } from './screens/quick-cmd';
import { Screen, InputAction } from './utils/constants';

// --- State ---
let currentScreen = Screen.DASHBOARD;
let selectedAgentIdx = 0;
let notificationOffset = 0;
let quickCmdIdx = 0;
let lastResult: string | undefined;

// --- Initialize ---
async function boot() {
  const appEl = document.getElementById('app');
  if (!appEl) return;

  const log = (msg: string) => {
    appEl.textContent += '\n' + msg;
  };

  try {
    // 1. Initialize bridges
    log('Init display...');
    await initDisplay();
    log('Init input...');
    await initInput(handleInput);
    log('Init audio...');
    await initAudio();

    // 2. Connect to Hermes
    log('Connecting to Hermes...');
    const ws = new HermesWebSocket({ url: 'ws://127.0.0.1:9090' });
    initDispatcher(ws);

    ws.on((event) => {
      switch (event.type) {
        case 'agent_update':
          upsertAgent(event.agent);
          refresh();
          break;
        case 'notification':
          addNotification(event.notification);
          refresh();
          break;
        case 'connected':
          log('Connected to Hermes ✓');
          refresh();
          break;
        case 'disconnected':
          log('Disconnected — reconnecting...');
          refresh();
          break;
        case 'error':
          log(`Error: ${event.message}`);
          refresh();
          break;
        case 'command_result':
          lastResult = event.result;
          refresh();
          break;
      }
    });

    ws.connect();

    // 3. Periodic offline detection
    setInterval(() => {
      markOffline();
      refresh();
    }, 30_000);

  } catch (e) {
    await render([`BOOT ERROR`, `${e}`, '', '']);
  }
}

// --- Input Handler ---
function handleInput(action: InputAction) {
  const agents = getAgents();

  switch (currentScreen) {
    case Screen.DASHBOARD:
      if (action === InputAction.TAP) {
        if (agents.length > 0) {
          currentScreen = Screen.AGENT_DETAIL;
          selectedAgentIdx = 0;
        }
      } else if (action === InputAction.DOUBLE_TAP) {
        currentScreen = Screen.NOTIFICATIONS;
        notificationOffset = 0;
      } else if (action === InputAction.SCROLL_DOWN) {
        currentScreen = Screen.QUICK_CMD;
        quickCmdIdx = 0;
      }
      break;

    case Screen.AGENT_DETAIL:
      if (action === InputAction.TAP) {
        // Cycle to next agent or back to dashboard
        selectedAgentIdx++;
        if (selectedAgentIdx >= agents.length) {
          currentScreen = Screen.DASHBOARD;
          selectedAgentIdx = 0;
        }
      } else if (action === InputAction.DOUBLE_TAP) {
        currentScreen = Screen.DASHBOARD;
      }
      break;

    case Screen.NOTIFICATIONS:
      if (action === InputAction.SCROLL_DOWN) {
        const stats = getNotificationStats();
        notificationOffset = Math.min(
          notificationOffset + 1,
          Math.max(0, stats.total - 3)
        );
      } else if (action === InputAction.SCROLL_UP) {
        notificationOffset = Math.max(0, notificationOffset - 1);
      } else if (action === InputAction.DOUBLE_TAP) {
        currentScreen = Screen.DASHBOARD;
        markAllRead();
      } else if (action === InputAction.TAP) {
        markAllRead();
      }
      break;

    case Screen.QUICK_CMD:
      if (action === InputAction.SCROLL_DOWN) {
        quickCmdIdx = Math.min(quickCmdIdx + 1, QUICK_COMMANDS.length - 1);
      } else if (action === InputAction.SCROLL_UP) {
        quickCmdIdx = Math.max(0, quickCmdIdx - 1);
      } else if (action === InputAction.TAP) {
        // Execute selected command
        const cmd = QUICK_COMMANDS[quickCmdIdx];
        if (cmd) {
          dispatch(cmd.command).catch((e) => {
            lastResult = `Error: ${e.message}`;
            refresh();
          });
          lastResult = `Running: ${cmd.label}...`;
        }
      } else if (action === InputAction.DOUBLE_TAP) {
        currentScreen = Screen.DASHBOARD;
        // If recording, stop
        if (isRecording()) stopRecording();
      }
      break;
  }

  refresh();
}

// --- Render ---
function refresh() {
  switch (currentScreen) {
    case Screen.DASHBOARD: {
      const stats = getAgentStats();
      const notifStats = getNotificationStats();
      renderDashboard({
        agents: getTopAgents(3),
        ...stats,
        connected: true, // TODO: get from WS state
        unreadNotifications: notifStats.unread,
      }).then((lines) => {
        render(lines);
        updateDebug(lines);
      });
      break;
    }

    case Screen.AGENT_DETAIL: {
      const agents = getAgents();
      const agent = agents[selectedAgentIdx];
      if (agent) {
        render(renderAgentDetail(agent));
        updateDebug(renderAgentDetail(agent));
      } else {
        currentScreen = Screen.DASHBOARD;
        refresh();
      }
      break;
    }

    case Screen.NOTIFICATIONS: {
      const stats = getNotificationStats();
      const items = getNotifications({ limit: 50 });
      render(
        renderNotifications({
          items,
          offset: notificationOffset,
          total: stats.total,
          unread: stats.unread,
        })
      );
      break;
    }

    case Screen.QUICK_CMD: {
      render(
        renderQuickCmd({
          selectedIndex: quickCmdIdx,
          totalCommands: QUICK_COMMANDS.length,
          lastResult,
          recording: isRecording(),
        })
      );
      break;
    }
  }
}

function updateDebug(lines: string[]) {
  const el = document.getElementById('app');
  if (el) {
    el.textContent = lines.join('\n');
  }
}

// --- Start ---
boot();
