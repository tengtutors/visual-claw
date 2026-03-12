import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { createConnection } from './connection.js';
import { createOpenClawConnection } from './openclaw-connection.js';
import { MOCK_AGENTS, MOCK_EVENTS, getNextDemoChange } from './mock-data.js';
import { STATE_TO_ZONE, STATES } from './constants.js';

const StoreContext = createContext(null);
const DispatchContext = createContext(null);

const MAX_EVENTS = 200;

// ─── Agent name formatting ───

// Map OpenClaw agent IDs to friendly display names
const AGENT_DISPLAY_NAMES = {
  main: 'Macoteng',
  second: 'Acevideo',
  vision: 'Tingeyes',
  ting: 'Ting',
  tung: 'Tung',
};

function formatBotName(agentId) {
  if (AGENT_DISPLAY_NAMES[agentId]) return AGENT_DISPLAY_NAMES[agentId];
  return agentId
    .replace(/_bot$/i, '')
    .replace(/_/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function createAgentFromEvent(event) {
  const botName = event.agent;
  const displayName = formatBotName(botName);
  const id = `bot-${botName}`;
  const state = event.state || 'idle';
  const zone = STATE_TO_ZONE[state] || event.zone || 'rest';

  return {
    id,
    name: displayName,
    botUsername: botName,
    role: 'Developer',
    classTitle: 'Telegram Agent',
    isTelegramBot: true,
    state,
    zone,
    currentTaskId: event.task ? `task-${Date.now()}` : null,
    currentTask: event.task || null,
    currentTaskTitle: event.task || null,
    currentTool: event.tool || null,
    lastAction: event.task || 'Idle',
    chatSnippet: event.task || null,
    chatSnippetTs: event.task ? Date.now() : 0,
    collaboratingWith: [],
    blockedReason: state === STATES.BLOCKED ? (event.reason || 'Blocked') : null,
    startedCurrentTaskAt: event.task ? new Date().toISOString() : null,
    lastUpdated: new Date(event.timestamp ? event.timestamp * 1000 : Date.now()).toISOString(),
    skills: { coding: 70, debugging: 60, apiIntegration: 65, planning: 50, review: 55, research: 60 },
    tools: ['github', 'shell', 'python'],
    tasksCompleted: 0,
    avgCompletionMs: 0,
    totalBlocks: 0,
    collaborationCount: 0,
    successRate: 1.0,
    health: state === STATES.BLOCKED ? 'stressed' : 'good',
    level: 1,
    xp: 0,
    recentEvents: [],
  };
}

// ─── State ───

const initialState = {
  agents: [],
  events: [],
  connectionStatus: 'disconnected', // 'ws' | 'polling' | 'disconnected'
  openclawStatus: 'disconnected',
  demoMode: false,
  selectedAgentId: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_AGENTS':
      return { ...state, agents: action.agents };

    case 'UPDATE_AGENT': {
      const idx = state.agents.findIndex((a) => a.id === action.agent.id);
      const agents = [...state.agents];
      if (idx >= 0) {
        agents[idx] = { ...agents[idx], ...action.agent };
      } else {
        agents.push(action.agent);
      }
      return { ...state, agents };
    }

    case 'SET_EVENTS':
      return { ...state, events: action.events.slice(-MAX_EVENTS) };

    case 'ADD_EVENT':
      return { ...state, events: [...state.events, action.event].slice(-MAX_EVENTS) };

    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.status };

    case 'SET_OPENCLAW_STATUS':
      return { ...state, openclawStatus: action.status };

    case 'SET_DEMO_MODE':
      return { ...state, demoMode: action.enabled };

    case 'LOAD_MOCK':
      return { ...state, agents: MOCK_AGENTS.map((a) => ({ ...a })), events: [...MOCK_EVENTS] };

    case 'SET_STATE':
      return {
        ...state,
        agents: action.agents ?? state.agents,
        events: action.events ? action.events.slice(-MAX_EVENTS) : state.events,
      };

    case 'AGENT_EVENT': {
      const event = action.event;
      const agentId = `bot-${event.agent}`;
      const idx = state.agents.findIndex((a) => a.id === agentId);
      const newState = event.state || 'idle';
      const zone = STATE_TO_ZONE[newState] || event.zone || 'rest';

      let agents;

      if (idx >= 0) {
        agents = [...state.agents];
        const prev = agents[idx];
        agents[idx] = {
          ...prev,
          state: newState,
          zone,
          currentTask: event.task || prev.currentTask,
          currentTaskTitle: event.task || prev.currentTaskTitle,
          currentTool: event.tool || null,
          lastAction: event.task || prev.lastAction,
          lastUpdated: new Date(event.timestamp ? event.timestamp * 1000 : Date.now()).toISOString(),
          health: newState === STATES.BLOCKED ? 'stressed' : newState === STATES.OFFLINE ? 'resting' : 'good',
          blockedReason: newState === STATES.BLOCKED ? (event.reason || 'Blocked') : null,
          // Chat bubble: update when new task text arrives
          ...(event.task && event.task !== prev.currentTask ? { chatSnippet: event.task, chatSnippetTs: Date.now() } : {}),
        };

        // Track completions and XP
        if (prev.state === STATES.WORKING && (newState === STATES.IDLE || newState === STATES.WAITING)) {
          agents[idx].tasksCompleted = (prev.tasksCompleted || 0) + 1;
          agents[idx].xp = (prev.xp || 0) + 50;
          agents[idx].level = Math.floor(agents[idx].xp / 200) + 1;
        }
        if (newState === STATES.BLOCKED) {
          agents[idx].totalBlocks = (prev.totalBlocks || 0) + 1;
        }

        // Update recent events
        const recentEvent = {
          type: newState === STATES.BLOCKED ? 'blocked' : newState === STATES.MEETING ? 'collaboration_started' : 'task_started',
          label: event.task || `${prev.name} → ${newState}`,
          timestamp: new Date().toISOString(),
        };
        agents[idx].recentEvents = [recentEvent, ...(prev.recentEvents || [])].slice(0, 10);
      } else {
        const newAgent = createAgentFromEvent(event);
        agents = [...state.agents, newAgent];
      }

      // Event log entry
      const displayName = idx >= 0 ? state.agents[idx].name : formatBotName(event.agent);
      let eventType = 'task_started';
      if (newState === STATES.BLOCKED) eventType = 'blocked';
      else if (newState === STATES.IDLE && idx >= 0 && state.agents[idx].state === STATES.WORKING) eventType = 'task_completed';
      else if (idx >= 0 && state.agents[idx].state === STATES.BLOCKED && newState !== STATES.BLOCKED) eventType = 'unblocked';
      else if (newState === STATES.MEETING) eventType = 'collaboration_started';

      const logEvent = {
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: eventType,
        agentId: agentId,
        agentName: displayName,
        detail: event.task || `State: ${newState}`,
        ts: event.timestamp ? event.timestamp * 1000 : Date.now(),
      };

      return {
        ...state,
        agents,
        events: [...state.events, logEvent].slice(-MAX_EVENTS),
      };
    }

    case 'SELECT_AGENT':
      return { ...state, selectedAgentId: action.agentId };

    case 'DESELECT_AGENT':
      return { ...state, selectedAgentId: null };

    default:
      return state;
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const connRef = useRef(null);
  const openclawConnRef = useRef(null);
  const demoTimerRef = useRef(null);

  // Persist state to chrome.storage (only in demo mode)
  useEffect(() => {
    if (state.demoMode && state.agents.length > 0 && typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ agentState: { agents: state.agents, events: state.events } });
    }
  }, [state.agents, state.events, state.demoMode]);

  // Load persisted state on mount (only if demo mode)
  useEffect(() => {
    if (state.demoMode && typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get('agentState', (result) => {
        if (result.agentState?.agents?.length) {
          dispatch({ type: 'SET_STATE', agents: result.agentState.agents, events: result.agentState.events });
        }
      });
    }
  }, []);

  // Update badge when blocked agents change
  useEffect(() => {
    const blockedCount = state.agents.filter((a) => a.state === STATES.BLOCKED).length;
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'UPDATE_BADGE', count: blockedCount }).catch(() => {});
    }
  }, [state.agents]);

  // Connection management
  useEffect(() => {
    if (state.demoMode) {
      connRef.current?.stop();
      openclawConnRef.current?.stop();
      dispatch({ type: 'LOAD_MOCK' });
      return;
    }

    // OpenClaw gateway connection
    const oclConn = createOpenClawConnection({
      onAgentEvent(event) {
        dispatch({ type: 'AGENT_EVENT', event });

        // Notify blocked bots
        if (event.state === STATES.BLOCKED && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage({
            type: 'AGENT_BLOCKED',
            agentName: formatBotName(event.agent),
            reason: event.reason || 'Blocked',
          }).catch(() => {});
        }
      },
      onStatusChange(status) {
        dispatch({ type: 'SET_OPENCLAW_STATUS', status });
      },
    });
    openclawConnRef.current = oclConn;
    oclConn.start();

    return () => {
      oclConn.stop();
    };
  }, [state.demoMode]);

  // Demo auto-simulation
  useEffect(() => {
    if (!state.demoMode) {
      clearInterval(demoTimerRef.current);
      return;
    }

    demoTimerRef.current = setInterval(() => {
      dispatch((prevDispatch) => {}); // placeholder
    }, 5000);

    return () => clearInterval(demoTimerRef.current);
  }, [state.demoMode]);

  return (
    <StoreContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}

export function useDispatch() {
  return useContext(DispatchContext);
}

export function useSelectedAgent() {
  const { agents, selectedAgentId } = useStore();
  if (!selectedAgentId) return null;
  return agents.find((a) => a.id === selectedAgentId) || null;
}

export function useActions() {
  const dispatch = useDispatch();
  const store = useStore();

  const toggleDemoMode = useCallback(() => {
    dispatch({ type: 'SET_DEMO_MODE', enabled: !store.demoMode });
  }, [dispatch, store.demoMode]);

  const simulateChange = useCallback(() => {
    const changed = getNextDemoChange(store.agents);
    if (changed) {
      const oldAgent = store.agents.find((a) => a.id === changed.id);
      dispatch({ type: 'UPDATE_AGENT', agent: changed });

      let eventType = 'task_started';
      let detail = changed.currentTask || '';
      if (changed.state === STATES.BLOCKED) {
        eventType = 'blocked';
        detail = changed.blockedReason;

        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage({
            type: 'AGENT_BLOCKED',
            agentName: changed.name,
            reason: changed.blockedReason,
          }).catch(() => {});
        }
      } else if (oldAgent?.state === STATES.BLOCKED && changed.state !== STATES.BLOCKED) {
        eventType = 'unblocked';
      } else if (changed.state === STATES.MEETING) {
        eventType = 'collaboration_started';
      } else if (changed.state === STATES.IDLE && oldAgent?.state === STATES.WORKING) {
        eventType = 'task_completed';
        detail = oldAgent.currentTask || 'Task finished';
      }

      dispatch({
        type: 'ADD_EVENT',
        event: {
          id: `evt-${Date.now()}`,
          type: eventType,
          agentId: changed.id,
          agentName: changed.name,
          detail,
          ts: Date.now(),
        },
      });
    }
  }, [dispatch, store.agents]);

  const setAgentState = useCallback(
    (agentId, newState) => {
      const agent = store.agents.find((a) => a.id === agentId);
      if (!agent) return;

      const zone = STATE_TO_ZONE[newState] || agent.zone;
      const updates = {
        ...agent,
        state: newState,
        zone,
        lastUpdated: new Date().toISOString(),
        blockedReason: newState === STATES.BLOCKED ? 'Manually blocked' : null,
        health: newState === STATES.BLOCKED ? 'stressed' : 'good',
        lastAction: `State changed to ${newState}`,
      };

      dispatch({ type: 'UPDATE_AGENT', agent: updates });

      let eventType = 'task_started';
      if (newState === STATES.BLOCKED) eventType = 'blocked';
      else if (newState === STATES.IDLE) eventType = 'task_completed';
      else if (newState === STATES.MEETING) eventType = 'collaboration_started';

      dispatch({
        type: 'ADD_EVENT',
        event: {
          id: `evt-${Date.now()}`,
          type: eventType,
          agentId: agent.id,
          agentName: agent.name,
          detail: `State changed to ${newState}`,
          ts: Date.now(),
        },
      });

      if (newState === STATES.BLOCKED && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'AGENT_BLOCKED',
          agentName: agent.name,
          reason: 'Manually blocked',
        }).catch(() => {});
      }
    },
    [dispatch, store.agents]
  );

  const selectAgent = useCallback((agentId) => {
    dispatch({ type: 'SELECT_AGENT', agentId });
  }, [dispatch]);

  const deselectAgent = useCallback(() => {
    dispatch({ type: 'DESELECT_AGENT' });
  }, [dispatch]);

  return { toggleDemoMode, simulateChange, setAgentState, selectAgent, deselectAgent };
}
