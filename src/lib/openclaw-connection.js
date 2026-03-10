/**
 * OpenClaw gateway connection — connects to the local OpenClaw gateway
 * via its WebSocket protocol (with handshake) and translates agent run
 * lifecycle events into workspace monitor agent events.
 *
 * Gateway WS protocol:
 * 1. Server sends: { type: "event", event: "connect.challenge", payload: { nonce, ts } }
 * 2. Client sends: { type: "req", id, method: "connect", params: { ... auth: { token } } }
 * 3. Server sends: { type: "res", id, ok: true, payload: { ... } }
 * 4. Server broadcasts: { type: "event", event: "agent"|"health"|..., payload: { ... } }
 */

import { OPENCLAW_WS_URL, OPENCLAW_AUTH_TOKEN } from './constants.js';

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function createOpenClawConnection({ onAgentEvent, onStatusChange }) {
  let ws = null;
  let stopped = false;
  let mode = 'disconnected';
  let reconnectTimer = null;
  let reconnectDelay = 2000;

  // Track active runs → agent state mapping
  const activeRuns = new Map(); // runId → { agentId, sessionKey, startedAt }

  function setMode(m) {
    if (mode !== m) {
      mode = m;
      onStatusChange?.(m);
    }
  }

  // Throttle assistant text updates per agent (max once per 2s)
  const lastAssistantUpdate = new Map();

  function deriveAgentId(payload) {
    // sessionKey formats:
    //   "agent:main:main"                → "main"
    //   "agent:second:main"              → "second"
    //   "agent:main:subagent:abc123"     → "main/sub-abc1"
    //   "subagent:xyz789"               → "sub-xyz7"
    const sessionKey = payload.sessionKey || '';
    const parts = sessionKey.split(':');

    // Check for subagent pattern
    const subIdx = parts.indexOf('subagent');
    if (subIdx >= 0) {
      const parentAgent = (parts[0] === 'agent' && parts[1]) ? parts[1] : 'main';
      const subId = parts[subIdx + 1] || payload.runId?.slice(0, 6) || 'x';
      return parentAgent + '/sub-' + subId.slice(0, 4);
    }

    if (parts[0] === 'agent' && parts[1]) return parts[1];
    if (parts[1]) return parts[1];
    return parts[0] || 'main';
  }

  function handleAgentPayload(payload) {
    if (!payload || !payload.runId) return;

    const { runId, stream, data } = payload;
    const agentId = deriveAgentId(payload);
    const now = Date.now();

    if (stream === 'lifecycle') {
      const phase = data?.phase;

      if (phase === 'start') {
        activeRuns.set(runId, { agentId, startedAt: now });
        onAgentEvent?.({
          agent: agentId,
          state: 'working',
          task: 'Starting…',
          timestamp: Math.floor(now / 1000),
        });
      } else if (phase === 'end') {
        activeRuns.delete(runId);
        onAgentEvent?.({
          agent: agentId,
          state: 'idle',
          timestamp: Math.floor(now / 1000),
        });
      } else if (phase === 'error') {
        activeRuns.delete(runId);
        onAgentEvent?.({
          agent: agentId,
          state: 'blocked',
          reason: data?.error || 'Error',
          timestamp: Math.floor(now / 1000),
        });
      }
    } else if (stream === 'tool') {
      const toolName = data?.name || data?.tool;
      if (toolName) {
        onAgentEvent?.({
          agent: agentId,
          state: 'working',
          tool: toolName,
          task: `Using ${toolName}`,
          timestamp: Math.floor(now / 1000),
        });
      }
    } else if (stream === 'thinking') {
      // Thinking = meeting room (deliberating)
      onAgentEvent?.({
        agent: agentId,
        state: 'meeting',
        task: 'Thinking…',
        timestamp: Math.floor(now / 1000),
      });
    } else if (stream === 'compaction') {
      // Compaction = waiting (washroom break)
      onAgentEvent?.({
        agent: agentId,
        state: 'waiting',
        task: 'Compacting…',
        timestamp: Math.floor(now / 1000),
      });
    } else if (stream === 'assistant') {
      // Throttle: only update task text every 2s per agent
      const lastUpdate = lastAssistantUpdate.get(agentId) || 0;
      if (now - lastUpdate < 2000) return;
      lastAssistantUpdate.set(agentId, now);

      const text = data?.text;
      if (text) {
        // Take last meaningful chunk of text
        const clean = text.replace(/[#*_\n]+/g, ' ').trim();
        const task = clean.length > 50 ? '…' + clean.slice(-48) : clean;
        onAgentEvent?.({
          agent: agentId,
          state: 'working',
          task: task || 'Writing…',
          timestamp: Math.floor(now / 1000),
        });
      }
    }
  }

  function connectWs() {
    if (stopped) return;

    try {
      ws = new WebSocket(OPENCLAW_WS_URL);
    } catch {
      scheduleReconnect();
      return;
    }

    let connectId = null;
    let handshakeDone = false;

    ws.onopen = () => {
      reconnectDelay = 2000;
      console.log('[OpenClaw] WS opened');
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);

        if (msg.type === 'event' && msg.event === 'connect.challenge') {
          connectId = uuid();
          ws.send(JSON.stringify({
            type: 'req',
            id: connectId,
            method: 'connect',
            params: {
              minProtocol: 3,
              maxProtocol: 3,
              client: {
                id: 'gateway-client',
                version: '1.0.0',
                platform: 'chrome-extension',
                mode: 'backend',
              },
              auth: {
                token: OPENCLAW_AUTH_TOKEN,
              },
            },
          }));
          return;
        }

        if (msg.type === 'res' && msg.id === connectId) {
          if (msg.ok) {
            handshakeDone = true;
            setMode('ws');
            console.log('[OpenClaw] Connected to gateway');
          } else {
            console.warn('[OpenClaw] Handshake failed:', msg.error?.message);
            ws?.close();
          }
          return;
        }

        // Handle broadcast events
        if (msg.type === 'event' && handshakeDone) {
          if (msg.event === 'agent' && msg.payload) {
            handleAgentPayload(msg.payload);
          }
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = (err) => {
      console.warn('[OpenClaw] WS error');
      ws?.close();
    };

    ws.onclose = (evt) => {
      ws = null;
      handshakeDone = false;
      console.log('[OpenClaw] WS closed:', evt.code, evt.reason);
      if (!stopped) {
        setMode('disconnected');
        scheduleReconnect();
      }
    };
  }

  function scheduleReconnect() {
    if (stopped) return;
    reconnectTimer = setTimeout(() => {
      connectWs();
    }, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 1.5, 30000);
  }

  return {
    start() {
      stopped = false;
      connectWs();
    },

    stop() {
      stopped = true;
      ws?.close();
      ws = null;
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
      setMode('disconnected');
    },

    getMode() {
      return mode;
    },
  };
}
