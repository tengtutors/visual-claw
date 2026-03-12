import React, { useState, useEffect } from 'react';

const PANEL_STYLE = {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(10, 14, 28, 0.94)',
  zIndex: 1000,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  padding: '20px 12px',
  fontFamily: "'Courier New', monospace",
  color: '#e0e0e0',
  overflow: 'auto',
};

const CARD = {
  background: '#1a1f35',
  border: '1px solid #334',
  borderRadius: '8px',
  padding: '14px',
  width: '100%',
  maxWidth: '360px',
  marginTop: '10px',
};

const INPUT = {
  width: '100%',
  padding: '8px 10px',
  background: '#0d1117',
  border: '1px solid #3a4',
  borderRadius: '4px',
  color: '#e0e0e0',
  fontFamily: "'Courier New', monospace",
  fontSize: '13px',
  marginTop: '6px',
  boxSizing: 'border-box',
};

const BTN = {
  padding: '8px 20px',
  background: '#2a6',
  border: 'none',
  borderRadius: '4px',
  color: '#fff',
  fontFamily: "'Courier New', monospace",
  fontSize: '13px',
  cursor: 'pointer',
  marginTop: '10px',
};

const CLOSE_BTN = {
  position: 'absolute',
  top: 6,
  right: 10,
  background: 'none',
  border: 'none',
  color: '#888',
  fontSize: '22px',
  cursor: 'pointer',
  fontFamily: 'monospace',
};

const STATE_DOT = (color) => ({
  display: 'inline-block',
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: color,
  marginRight: '6px',
});

// ── Gateway Setup (Doormat) ──
function GatewayPanel() {
  const [token, setToken] = useState('');
  const [url, setUrl] = useState('ws://localhost:18789');
  const [status, setStatus] = useState('idle'); // idle | checking | connected | failed

  const handleConnect = () => {
    setStatus('checking');
    try {
      const ws = new WebSocket(url);
      const timeout = setTimeout(() => {
        ws.close();
        setStatus('failed');
      }, 3000);
      ws.onopen = () => {
        clearTimeout(timeout);
        setStatus('connected');
        ws.close();
      };
      ws.onerror = () => {
        clearTimeout(timeout);
        setStatus('failed');
      };
    } catch {
      setStatus('failed');
    }
  };

  return (
    <>
      <div style={CARD}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: '#4a8' }}>Gateway Connection</div>
        <div style={{
          padding: '8px 10px', borderRadius: '4px', fontSize: '12px', marginBottom: '10px',
          background: status === 'connected' ? '#1a2a1f' : status === 'failed' ? '#2a1a1a' : '#0d1117',
          color: status === 'connected' ? '#4a8' : status === 'failed' ? '#a66' : '#888',
        }}>
          {status === 'idle' && 'Auto-detecting local gateway...'}
          {status === 'checking' && 'Connecting...'}
          {status === 'connected' && 'Connected to local gateway!'}
          {status === 'failed' && 'Could not connect. Enter details below.'}
        </div>
        <button style={{ ...BTN, background: status === 'connected' ? '#2a6' : '#468' }} onClick={handleConnect}>
          {status === 'checking' ? 'Checking...' : status === 'connected' ? 'Connected' : 'Auto-detect'}
        </button>
      </div>
      {(status === 'failed' || status === 'idle') && (
        <div style={CARD}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#da8' }}>Manual Setup</div>
          <label style={{ fontSize: '11px', color: '#8a8' }}>Gateway URL</label>
          <input style={INPUT} value={url} onChange={e => setUrl(e.target.value)} placeholder="ws://localhost:18789" />
          <label style={{ fontSize: '11px', color: '#8a8', marginTop: '8px', display: 'block' }}>Auth Token (if required)</label>
          <input style={INPUT} type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="Optional — leave blank for local" />
          <button style={BTN} onClick={handleConnect}>Connect</button>
        </div>
      )}
    </>
  );
}

// ── Create Agent (Computer/Desk) ──
const FILE_SERVER = 'http://127.0.0.1:18790';

function CreateAgentPanel({ agents }) {
  const [task, setTask] = useState('');
  const [agentName, setAgentName] = useState('');
  const [model, setModel] = useState('');
  const [botToken, setBotToken] = useState('');
  const [models, setModels] = useState([]);

  useEffect(() => {
    fetch(`${FILE_SERVER}/models`)
      .then(r => r.json())
      .then(list => {
        setModels(list);
        if (list.length > 0 && !model) setModel(list[0]);
      })
      .catch(() => {
        // Fallback if file server not running
        setModels(['zai/glm-5', 'zai/glm-4.7', 'zai/glm-4.7-flash']);
        if (!model) setModel('zai/glm-5');
      });
  }, []);

  return (
    <>
      <div style={CARD}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: '#adf' }}>New Agent</div>
        <label style={{ fontSize: '11px', color: '#8a8' }}>Agent Name</label>
        <input style={INPUT} value={agentName} onChange={e => setAgentName(e.target.value)} placeholder="e.g., Research Bot" />
        <label style={{ fontSize: '11px', color: '#8a8', marginTop: '8px', display: 'block' }}>Telegram Bot Token</label>
        <input style={INPUT} type="password" value={botToken} onChange={e => setBotToken(e.target.value)} placeholder="e.g., 123456:ABC-DEF..." />
        <div style={{ fontSize: '10px', color: '#555', marginTop: '4px' }}>
          Get from @BotFather on Telegram
        </div>
        <label style={{ fontSize: '11px', color: '#8a8', marginTop: '8px', display: 'block' }}>Model</label>
        <select style={{ ...INPUT, cursor: 'pointer' }} value={model} onChange={e => setModel(e.target.value)}>
          {models.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <label style={{ fontSize: '11px', color: '#8a8', marginTop: '8px', display: 'block' }}>Task / Instructions</label>
        <textarea
          style={{ ...INPUT, height: '100px', resize: 'vertical' }}
          value={task}
          onChange={e => setTask(e.target.value)}
          placeholder="Tell the agent what to do..."
        />
        <button style={BTN}>Deploy Agent</button>
      </div>
      {agents && agents.length > 0 && (
        <div style={CARD}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#8a8' }}>
            Active Agents ({agents.length})
          </div>
          {agents.map(a => (
            <div key={a.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 10px', background: '#0d1117', borderRadius: '4px', marginBottom: '3px',
              fontSize: '12px',
            }}>
              <span style={{ color: '#ccc' }}>{a.name || a.id}</span>
              <span style={{
                color: a.state === 'working' ? '#4a8' : a.state === 'blocked' ? '#a44' : '#888',
                fontSize: '11px',
              }}>
                {a.state || 'idle'}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── Cron / Scheduled Tasks (Water Cooler / Coffee) ──
function CronTasksPanel({ agents }) {
  const [cronExpr, setCronExpr] = useState('');
  const [cronTask, setCronTask] = useState('');
  const [cronAgent, setCronAgent] = useState('');

  // Placeholder scheduled tasks
  const scheduledTasks = [
    { id: 1, cron: '0 9 * * 1-5', task: 'Daily standup summary', agent: 'Atlas', enabled: true },
    { id: 2, cron: '0 */6 * * *', task: 'Health check all services', agent: 'Relay', enabled: true },
    { id: 3, cron: '0 0 * * 0', task: 'Weekly security scan', agent: 'Cipher', enabled: false },
  ];

  return (
    <>
      <div style={CARD}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: '#da8' }}>Scheduled Tasks</div>
        {scheduledTasks.map(t => (
          <div key={t.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 10px', background: '#0d1117', borderRadius: '4px', marginBottom: '4px',
            fontSize: '12px', opacity: t.enabled ? 1 : 0.5,
          }}>
            <div>
              <div style={{ color: '#ccc' }}>{t.task}</div>
              <div style={{ color: '#666', fontSize: '10px', marginTop: '2px' }}>
                {t.cron} &middot; {t.agent}
              </div>
            </div>
            <span style={{
              color: t.enabled ? '#4a8' : '#a44',
              fontSize: '11px', fontWeight: 'bold',
            }}>
              {t.enabled ? 'ON' : 'OFF'}
            </span>
          </div>
        ))}
      </div>
      <div style={CARD}>
        <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: '#adf' }}>New Schedule</div>
        <label style={{ fontSize: '11px', color: '#8a8' }}>Assign to Agent</label>
        <select style={{ ...INPUT, cursor: 'pointer' }} value={cronAgent} onChange={e => setCronAgent(e.target.value)}>
          <option value="">Select agent...</option>
          {(agents || []).map(a => (
            <option key={a.id} value={a.id}>{a.name || a.id}</option>
          ))}
        </select>
        <label style={{ fontSize: '11px', color: '#8a8', marginTop: '8px', display: 'block' }}>Cron Expression</label>
        <input style={INPUT} value={cronExpr} onChange={e => setCronExpr(e.target.value)} placeholder="e.g., 0 9 * * 1-5" />
        <div style={{ fontSize: '10px', color: '#555', marginTop: '4px' }}>
          min hour day month weekday
        </div>
        <label style={{ fontSize: '11px', color: '#8a8', marginTop: '8px', display: 'block' }}>Task</label>
        <textarea
          style={{ ...INPUT, height: '60px', resize: 'vertical' }}
          value={cronTask}
          onChange={e => setCronTask(e.target.value)}
          placeholder="What should the agent do on this schedule?"
        />
        <button style={BTN}>Add Schedule</button>
      </div>
    </>
  );
}

// ── Event Log (Shelves / Printer) ──
function EventLogPanel({ agents, events }) {
  const stateColor = (state) => {
    if (state === 'working') return '#4a8';
    if (state === 'blocked') return '#a44';
    if (state === 'meeting') return '#da8';
    if (state === 'reviewing') return '#adf';
    return '#888';
  };

  // Gather all recent events from all agents
  const allEvents = [];
  for (const a of (agents || [])) {
    for (const evt of (a.recentEvents || [])) {
      allEvents.push({ ...evt, agentName: a.name || a.id, agentState: a.state });
    }
  }
  allEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const displayEvents = allEvents.slice(0, 30);

  // Summary counts
  const totalAgents = (agents || []).length;
  const working = (agents || []).filter(a => a.state === 'working').length;
  const blocked = (agents || []).filter(a => a.state === 'blocked').length;
  const idle = (agents || []).filter(a => a.state === 'idle').length;

  return (
    <>
      <div style={CARD}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: '#adf' }}>Workspace Overview</div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#e0e0e0' }}>{totalAgents}</div>
            <div style={{ fontSize: '10px', color: '#888' }}>Total</div>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#4a8' }}>{working}</div>
            <div style={{ fontSize: '10px', color: '#888' }}>Working</div>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#a44' }}>{blocked}</div>
            <div style={{ fontSize: '10px', color: '#888' }}>Blocked</div>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#888' }}>{idle}</div>
            <div style={{ fontSize: '10px', color: '#888' }}>Idle</div>
          </div>
        </div>
      </div>
      <div style={CARD}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: '#da8' }}>
          Activity Feed
        </div>
        {displayEvents.length === 0 && (
          <div style={{ color: '#666', fontSize: '12px', padding: '8px' }}>No events yet.</div>
        )}
        {displayEvents.map((evt, i) => (
          <div key={i} style={{
            padding: '5px 10px', fontSize: '11px',
            borderLeft: `2px solid ${evt.type === 'blocked' ? '#a44' : evt.type === 'task_completed' ? '#4a8' : '#468'}`,
            marginBottom: '3px', paddingLeft: '8px',
            background: '#0d1117', borderRadius: '0 4px 4px 0',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#adf', fontWeight: 'bold' }}>{evt.agentName}</span>
              <span style={{ color: '#555' }}>
                {new Date(evt.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div style={{ color: '#888', marginTop: '2px' }}>{evt.label}</div>
          </div>
        ))}
      </div>
      <div style={CARD}>
        <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: '#adf' }}>
          Agent Roster
        </div>
        {(agents || []).map(a => (
          <div key={a.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '6px 10px', background: '#0d1117', borderRadius: '4px', marginBottom: '3px',
            fontSize: '12px',
          }}>
            <div>
              <span style={STATE_DOT(stateColor(a.state))} />
              <span style={{ color: '#ccc' }}>{a.name || a.id}</span>
              <span style={{ color: '#666', fontSize: '10px', marginLeft: '6px' }}>{a.role}</span>
            </div>
            <span style={{ color: stateColor(a.state), fontSize: '11px' }}>{a.state}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Workspace Config (Vending Machine / Boxes) ──
function WorkspaceConfigPanel({ agents }) {
  const [workspaceName, setWorkspaceName] = useState('My Workspace');
  const [defaultModel, setDefaultModel] = useState('');
  const [notifyBlocked, setNotifyBlocked] = useState(true);
  const [notifyComplete, setNotifyComplete] = useState(true);
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [models, setModels] = useState([]);

  useEffect(() => {
    fetch(`${FILE_SERVER}/models`)
      .then(r => r.json())
      .then(list => {
        setModels(list);
        if (list.length > 0 && !defaultModel) setDefaultModel(list[0]);
      })
      .catch(() => {});
  }, []);

  const totalTasks = (agents || []).reduce((sum, a) => sum + (a.tasksCompleted || 0), 0);
  const totalBlocks = (agents || []).reduce((sum, a) => sum + (a.totalBlocks || 0), 0);

  return (
    <>
      <div style={CARD}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: '#adf' }}>Workspace</div>
        <label style={{ fontSize: '11px', color: '#8a8' }}>Workspace Name</label>
        <input style={INPUT} value={workspaceName} onChange={e => setWorkspaceName(e.target.value)} />
        <label style={{ fontSize: '11px', color: '#8a8', marginTop: '8px', display: 'block' }}>Default Model</label>
        <select style={{ ...INPUT, cursor: 'pointer' }} value={defaultModel} onChange={e => setDefaultModel(e.target.value)}>
          {models.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <button style={{ ...BTN, marginTop: '12px' }}>Save</button>
      </div>
      <div style={CARD}>
        <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '10px', color: '#da8' }}>Notifications</div>
        {[
          ['Agent blocked', notifyBlocked, setNotifyBlocked],
          ['Task completed', notifyComplete, setNotifyComplete],
          ['Auto-reconnect', autoReconnect, setAutoReconnect],
        ].map(([label, value, setter]) => (
          <div key={label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '6px 10px', background: '#0d1117', borderRadius: '4px', marginBottom: '3px',
            fontSize: '12px', cursor: 'pointer',
          }} onClick={() => setter(!value)}>
            <span style={{ color: '#ccc' }}>{label}</span>
            <span style={{
              color: value ? '#4a8' : '#a44',
              fontSize: '11px', fontWeight: 'bold',
            }}>
              {value ? 'ON' : 'OFF'}
            </span>
          </div>
        ))}
      </div>
      <div style={CARD}>
        <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: '#adf' }}>Workspace Stats</div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4a8' }}>{totalTasks}</div>
            <div style={{ fontSize: '10px', color: '#888' }}>Total Tasks</div>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#a44' }}>{totalBlocks}</div>
            <div style={{ fontSize: '10px', color: '#888' }}>Total Blocks</div>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#adf' }}>{(agents || []).length}</div>
            <div style={{ fontSize: '10px', color: '#888' }}>Agents</div>
          </div>
        </div>
      </div>
    </>
  );
}

const PANELS = {
  gateway_token: GatewayPanel,
  create_agent: CreateAgentPanel,
  cron_tasks: CronTasksPanel,
  event_log: EventLogPanel,
  workspace_config: WorkspaceConfigPanel,
};

export default function FurniturePanel({ action, label, icon, agents, events, onClose }) {
  const PanelContent = PANELS[action];

  return (
    <div style={PANEL_STYLE}>
      <button style={CLOSE_BTN} onClick={onClose}>&times;</button>
      <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '2px' }}>
        {icon} {label}
      </div>
      {PanelContent ? (
        <PanelContent agents={agents} events={events} />
      ) : (
        <div style={CARD}>
          <div style={{ color: '#888', fontSize: '13px' }}>Panel not implemented yet.</div>
        </div>
      )}
    </div>
  );
}
