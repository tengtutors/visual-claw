import { WS_URL, API_URL, POLL_INTERVAL_MS } from './constants.js';

/**
 * Modular connection layer. Tries WebSocket first, falls back to polling.
 * Usage:
 *   const conn = createConnection({ onState, onEvent, onStatusChange });
 *   conn.start();
 *   conn.stop();
 */
export function createConnection({ onState, onEvent, onStatusChange }) {
  let ws = null;
  let pollTimer = null;
  let stopped = false;
  let mode = 'disconnected'; // 'ws' | 'polling' | 'disconnected'

  function setMode(m) {
    mode = m;
    onStatusChange?.(m);
  }

  // --- WebSocket ---
  function connectWs() {
    if (stopped) return;
    try {
      ws = new WebSocket(WS_URL);
    } catch {
      fallbackToPolling();
      return;
    }

    ws.onopen = () => {
      setMode('ws');
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'state') {
          onState?.(msg.agents, msg.events);
        } else if (msg.type === 'event') {
          onEvent?.(msg.event);
        } else if (msg.type === 'agent_update') {
          onState?.(msg.agents, null);
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = () => {
      ws?.close();
    };

    ws.onclose = () => {
      ws = null;
      if (!stopped) {
        fallbackToPolling();
      }
    };
  }

  // --- Polling ---
  function fallbackToPolling() {
    if (stopped) return;
    setMode('polling');
    poll();
  }

  async function poll() {
    if (stopped) return;
    try {
      const res = await fetch(`${API_URL}/state`);
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      onState?.(data.agents, data.events);
      setMode('polling');
    } catch {
      setMode('disconnected');
    }
    if (!stopped) {
      pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
    }
  }

  // --- Public API ---
  return {
    start() {
      stopped = false;
      connectWs();
      // If WS doesn't connect within 3s, fall back
      setTimeout(() => {
        if (mode === 'disconnected' && !stopped) {
          fallbackToPolling();
        }
      }, 3000);
    },

    stop() {
      stopped = true;
      ws?.close();
      ws = null;
      clearTimeout(pollTimer);
      pollTimer = null;
      setMode('disconnected');
    },

    getMode() {
      return mode;
    },
  };
}
