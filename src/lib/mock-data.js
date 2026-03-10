import { STATES } from './constants.js';

const ROLE_CLASS_TITLES = {
  Planner: 'War Strategist',
  Developer: 'Code Knight',
  Reviewer: 'Guard Mage',
  Designer: 'Pixel Artisan',
  Security: 'Shield Sentinel',
  DevOps: 'Ops Mechanist',
  Tester: 'Bug Hunter',
};

const ROLE_SKILLS = {
  Planner: { coding: 40, debugging: 35, apiIntegration: 50, securityAnalysis: 30, deployment: 45, uiDesign: 30, planning: 95, review: 70, routing: 88, research: 76 },
  Developer: { coding: 92, debugging: 85, apiIntegration: 78, securityAnalysis: 42, deployment: 55, uiDesign: 35, planning: 40, review: 66, routing: 30, research: 50 },
  Reviewer: { coding: 72, debugging: 88, apiIntegration: 55, securityAnalysis: 75, deployment: 30, uiDesign: 20, planning: 50, review: 94, routing: 35, research: 60 },
  Designer: { coding: 45, debugging: 30, apiIntegration: 20, securityAnalysis: 15, deployment: 25, uiDesign: 96, planning: 55, review: 48, routing: 20, research: 72 },
  Security: { coding: 65, debugging: 80, apiIntegration: 60, securityAnalysis: 97, deployment: 50, uiDesign: 10, planning: 40, review: 78, routing: 35, research: 85 },
  DevOps: { coding: 70, debugging: 68, apiIntegration: 72, securityAnalysis: 62, deployment: 95, uiDesign: 15, planning: 50, review: 55, routing: 80, research: 45 },
  Tester: { coding: 60, debugging: 93, apiIntegration: 50, securityAnalysis: 55, deployment: 40, uiDesign: 20, planning: 35, review: 80, routing: 30, research: 65 },
};

const ROLE_TOOLS = {
  Planner: ['slack', 'calendar', 'github', 'email'],
  Developer: ['github', 'docker', 'nodejs', 'shell', 'python', 'postgres'],
  Reviewer: ['github', 'shell', 'browser'],
  Designer: ['browser', 'slack', 'github'],
  Security: ['shell', 'docker', 'python', 'browser', 'github'],
  DevOps: ['docker', 'shell', 'github', 'postgres', 'nodejs'],
  Tester: ['shell', 'browser', 'docker', 'github', 'python'],
};

function makeRecentEvents(agentName, state) {
  const now = Date.now();
  const events = [
    { type: 'task_assigned', label: `${agentName} received new task`, timestamp: new Date(now - 600000).toISOString() },
    { type: 'task_started', label: `${agentName} started working`, timestamp: new Date(now - 540000).toISOString() },
  ];
  if (state === STATES.BLOCKED) {
    events.push({ type: 'blocked', label: `${agentName} got blocked`, timestamp: new Date(now - 120000).toISOString() });
  }
  if (state === STATES.MEETING) {
    events.push({ type: 'collaboration_started', label: `${agentName} joined meeting`, timestamp: new Date(now - 180000).toISOString() });
  }
  if (state === STATES.REVIEWING) {
    events.push({ type: 'task_started', label: `${agentName} started review`, timestamp: new Date(now - 300000).toISOString() });
  }
  events.push({ type: 'task_completed', label: `${agentName} completed previous task`, timestamp: new Date(now - 900000).toISOString() });
  return events.slice(0, 8);
}

function makeAgent(id, name, role, state, zone, taskId, task, collabs, blockedReason, extra) {
  const now = Date.now();
  return {
    id,
    name,
    role,
    classTitle: ROLE_CLASS_TITLES[role] || 'Adventurer',
    state,
    zone,
    currentTaskId: taskId,
    currentTask: task,
    currentTaskTitle: task,
    lastAction: extra?.lastAction || (task ? `Working on ${task}` : 'Idle'),
    collaboratingWith: collabs || [],
    blockedReason,
    startedCurrentTaskAt: taskId ? new Date(now - 360000).toISOString() : null,
    lastUpdated: new Date(now).toISOString(),
    skills: { ...(ROLE_SKILLS[role] || ROLE_SKILLS.Developer) },
    tools: [...(ROLE_TOOLS[role] || ['github', 'shell'])],
    tasksCompleted: 20 + Math.floor(Math.random() * 30),
    avgCompletionMs: 100000 + Math.floor(Math.random() * 120000),
    totalBlocks: Math.floor(Math.random() * 8),
    collaborationCount: 5 + Math.floor(Math.random() * 20),
    successRate: 0.8 + Math.random() * 0.18,
    health: state === STATES.BLOCKED ? 'stressed' : state === STATES.OFFLINE ? 'resting' : 'good',
    level: 5 + Math.floor(Math.random() * 20),
    xp: Math.floor(Math.random() * 1000),
    recentEvents: makeRecentEvents(name, state),
  };
}

export const MOCK_AGENTS = [
  makeAgent('agent-1', 'Atlas', 'Planner', STATES.WORKING, 'work', 'task-101', 'Designing sprint backlog', [], null, { lastAction: 'Organizing user stories' }),
  makeAgent('agent-2', 'Nova', 'Developer', STATES.WORKING, 'work', 'task-102', 'Implementing auth module', ['agent-3'], null, { lastAction: 'Editing auth middleware' }),
  makeAgent('agent-3', 'Echo', 'Developer', STATES.MEETING, 'meeting', 'task-102', 'Pair programming with Nova', ['agent-2'], null, { lastAction: 'Discussing auth flow' }),
  makeAgent('agent-4', 'Sentry', 'Reviewer', STATES.REVIEWING, 'work', 'task-099', 'Reviewing PR #47', [], null, { lastAction: 'Checking test coverage' }),
  makeAgent('agent-5', 'Bolt', 'Developer', STATES.BLOCKED, 'blocked', 'task-103', 'Database migration', [], 'Waiting for DB credentials from admin', { lastAction: 'Wrote migration script' }),
  makeAgent('agent-6', 'Pixel', 'Designer', STATES.IDLE, 'rest', null, null, [], null, { lastAction: 'Finished mockup designs' }),
  makeAgent('agent-7', 'Cipher', 'Security', STATES.WAITING, 'rest', 'task-104', 'Waiting for scan results', [], null, { lastAction: 'Initiated security scan' }),
  makeAgent('agent-8', 'Relay', 'DevOps', STATES.OFFLINE, 'rest', null, null, [], null, { lastAction: 'Deployed v2.3.1' }),
];

export const MOCK_EVENTS = [
  { id: 'evt-1', type: 'task_assigned', agentId: 'agent-1', agentName: 'Atlas', detail: 'Designing sprint backlog', ts: Date.now() - 300000 },
  { id: 'evt-2', type: 'task_started', agentId: 'agent-2', agentName: 'Nova', detail: 'Implementing auth module', ts: Date.now() - 240000 },
  { id: 'evt-3', type: 'collaboration_started', agentId: 'agent-3', agentName: 'Echo', detail: 'Collaborating with Nova', ts: Date.now() - 180000 },
  { id: 'evt-4', type: 'blocked', agentId: 'agent-5', agentName: 'Bolt', detail: 'Waiting for DB credentials from admin', ts: Date.now() - 120000 },
  { id: 'evt-5', type: 'task_started', agentId: 'agent-4', agentName: 'Sentry', detail: 'Reviewing PR #47', ts: Date.now() - 60000 },
  { id: 'evt-6', type: 'task_completed', agentId: 'agent-6', agentName: 'Pixel', detail: 'Finished mockup designs', ts: Date.now() - 30000 },
];

const DEMO_SCENARIOS = [
  (agents) => {
    const idle = agents.find((a) => a.state === STATES.IDLE);
    if (idle) return { ...idle, state: STATES.WORKING, zone: 'work', currentTaskId: 'task-new', currentTask: 'New feature work', currentTaskTitle: 'New feature work', lastAction: 'Starting new feature', startedCurrentTaskAt: new Date().toISOString(), health: 'good', lastUpdated: new Date().toISOString() };
    return null;
  },
  (agents) => {
    const working = agents.find((a) => a.state === STATES.WORKING && !a.blockedReason);
    if (working) return { ...working, state: STATES.BLOCKED, zone: 'blocked', blockedReason: 'API rate limit hit', lastAction: 'Hit rate limit', health: 'stressed', lastUpdated: new Date().toISOString() };
    return null;
  },
  (agents) => {
    const blocked = agents.find((a) => a.state === STATES.BLOCKED);
    if (blocked) return { ...blocked, state: STATES.WORKING, zone: 'work', blockedReason: null, lastAction: 'Resumed work', health: 'good', lastUpdated: new Date().toISOString() };
    return null;
  },
  (agents) => {
    const working = agents.find((a) => a.state === STATES.WORKING);
    if (working) return { ...working, state: STATES.MEETING, zone: 'meeting', currentTask: 'Team standup', currentTaskTitle: 'Team standup', lastAction: 'Joined standup', lastUpdated: new Date().toISOString() };
    return null;
  },
  (agents) => {
    const meeting = agents.find((a) => a.state === STATES.MEETING);
    if (meeting) {
      const completed = (meeting.tasksCompleted || 0) + 1;
      return { ...meeting, state: STATES.IDLE, zone: 'rest', currentTaskId: null, currentTask: null, currentTaskTitle: null, collaboratingWith: [], lastAction: 'Finished standup', tasksCompleted: completed, lastUpdated: new Date().toISOString() };
    }
    return null;
  },
];

let scenarioIndex = 0;

export function getNextDemoChange(agents) {
  for (let i = 0; i < DEMO_SCENARIOS.length; i++) {
    const idx = (scenarioIndex + i) % DEMO_SCENARIOS.length;
    const result = DEMO_SCENARIOS[idx](agents);
    if (result) {
      scenarioIndex = (idx + 1) % DEMO_SCENARIOS.length;
      return result;
    }
  }
  return null;
}
