export const STATES = {
  IDLE: 'idle',
  WORKING: 'working',
  WAITING: 'waiting',
  BLOCKED: 'blocked',
  MEETING: 'meeting',
  REVIEWING: 'reviewing',
  HANDOFF: 'handoff',
  OFFLINE: 'offline',
};

export const ZONES = {
  WORK: 'work',
  REST: 'rest',
  MEETING: 'meeting',
  BLOCKED: 'blocked',
};

export const STATE_TO_ZONE = {
  [STATES.IDLE]: ZONES.REST,
  [STATES.WORKING]: ZONES.WORK,
  [STATES.WAITING]: ZONES.REST,
  [STATES.BLOCKED]: ZONES.BLOCKED,
  [STATES.MEETING]: ZONES.MEETING,
  [STATES.REVIEWING]: ZONES.WORK,
  [STATES.HANDOFF]: ZONES.WORK,
  [STATES.OFFLINE]: ZONES.REST,
};

export const ZONE_META = {
  [ZONES.WORK]: { label: 'Work Area', emoji: '💻', color: '#2563eb' },
  [ZONES.REST]: { label: 'Break Room', emoji: '☕', color: '#16a34a' },
  [ZONES.MEETING]: { label: 'Meeting Room', emoji: '🤝', color: '#9333ea' },
  [ZONES.BLOCKED]: { label: 'Washroom', emoji: '🚻', color: '#dc2626' },
};

export const STATE_COLORS = {
  [STATES.IDLE]: '#94a3b8',
  [STATES.WORKING]: '#2563eb',
  [STATES.WAITING]: '#f59e0b',
  [STATES.BLOCKED]: '#dc2626',
  [STATES.MEETING]: '#9333ea',
  [STATES.REVIEWING]: '#0891b2',
  [STATES.HANDOFF]: '#ea580c',
  [STATES.OFFLINE]: '#64748b',
};

export const EVENT_TYPES = {
  TASK_ASSIGNED: 'task_assigned',
  TASK_STARTED: 'task_started',
  BLOCKED: 'blocked',
  UNBLOCKED: 'unblocked',
  COLLABORATION_STARTED: 'collaboration_started',
  TASK_COMPLETED: 'task_completed',
};

export const WS_URL = 'ws://localhost:9100/ws';
export const API_URL = 'http://localhost:9100';
export const POLL_INTERVAL_MS = 1500;

// OpenClaw runtime discovery
export const OPENCLAW_FALLBACK_WS_URLS = [
  'ws://127.0.0.1:18789',
  'ws://localhost:18789',
];
