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

// ── Gateway Setup (Doormat) ──
function GatewayPanel() {
  const [token, setToken] = useState('');
  const [url, setUrl] = useState('ws://localhost:18789');
  const [status, setStatus] = useState('idle'); // idle | checking | connected | failed
  const [restarting, setRestarting] = useState(false);
  const [restartMsg, setRestartMsg] = useState(null);

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

  const handleRestart = async () => {
    setRestarting(true);
    setRestartMsg(null);
    try {
      const resp = await fetch(`${FILE_SERVER}/gateway-restart`, { method: 'POST' });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Restart failed');
      setRestartMsg({ ok: true, text: 'Gateway restarted — reconnecting...' });
      setTimeout(handleConnect, 3000);
    } catch (err) {
      setRestartMsg({ ok: false, text: err.message });
    } finally {
      setRestarting(false);
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
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ ...BTN, background: status === 'connected' ? '#2a6' : '#468', flex: 1 }} onClick={handleConnect}>
            {status === 'checking' ? 'Checking...' : status === 'connected' ? 'Connected' : 'Auto-detect'}
          </button>
          <button
            style={{ ...BTN, background: '#da8', color: '#000', flex: 1, opacity: restarting ? 0.6 : 1 }}
            disabled={restarting}
            onClick={handleRestart}
          >
            {restarting ? 'Restarting...' : 'Restart Gateway'}
          </button>
        </div>
        {restartMsg && (
          <div style={{
            marginTop: '8px', padding: '8px 10px', borderRadius: '4px', fontSize: '12px',
            background: restartMsg.ok ? '#1a2a1f' : '#2a1a1a',
            color: restartMsg.ok ? '#4a8' : '#a66',
          }}>
            {restartMsg.text}
          </div>
        )}
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
  const [botToken, setBotToken] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState(null);
  const [allAgents, setAllAgents] = useState([]);
  const [deleting, setDeleting] = useState(null);

  const fetchAgents = () => {
    fetch(`${FILE_SERVER}/agents`)
      .then(r => r.json())
      .then(list => setAllAgents(list))
      .catch(() => {});
  };

  useEffect(() => { fetchAgents(); }, []);

  const handleDelete = async (id) => {
    if (!confirm(`Delete agent "${id}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const resp = await fetch(`${FILE_SERVER}/delete-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: id }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Delete failed');
      fetchAgents();
    } catch (err) {
      setDeployResult({ error: err.message });
    } finally {
      setDeleting(null);
    }
  };

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
        <label style={{ fontSize: '11px', color: '#8a8', marginTop: '8px', display: 'block' }}>Task / Instructions</label>
        <textarea
          style={{ ...INPUT, height: '100px', resize: 'vertical' }}
          value={task}
          onChange={e => setTask(e.target.value)}
          placeholder="Tell the agent what to do..."
        />
        <button
          style={{ ...BTN, opacity: deploying ? 0.6 : 1, background: deployResult?.ok ? '#2a6' : deployResult?.error ? '#a44' : '#2a6' }}
          disabled={deploying}
          onClick={async () => {
            if (!agentName.trim()) { setDeployResult({ error: 'Agent name is required' }); return; }
            setDeploying(true);
            setDeployResult(null);
            try {
              const resp = await fetch(`${FILE_SERVER}/create-agent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: agentName, botToken, task }),
              });
              const data = await resp.json();
              if (!resp.ok) {
                const partial = data.completedSteps?.length ? ` (completed: ${data.completedSteps.join(', ')})` : '';
                throw new Error((data.error || 'Deploy failed') + partial);
              }
              setDeployResult({ ok: true, message: data.message });
              setAgentName(''); setTask(''); setBotToken('');
            } catch (err) {
              setDeployResult({ error: err.message });
            } finally {
              setDeploying(false);
            }
          }}
        >
          {deploying ? 'Deploying...' : 'Deploy Agent'}
        </button>
        {deployResult && (
          <div style={{
            marginTop: '8px', padding: '8px 10px', borderRadius: '4px', fontSize: '12px',
            background: deployResult.ok ? '#1a2a1f' : '#2a1a1a',
            color: deployResult.ok ? '#4a8' : '#a66',
          }}>
            {deployResult.ok ? deployResult.message : deployResult.error}
          </div>
        )}
      </div>
      {allAgents.length > 0 && (
        <div style={CARD}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#8a8' }}>
            All Agents ({allAgents.length})
          </div>
          {allAgents.map(a => {
            const live = (agents || []).find(la => la.id === a.id);
            const state = live?.state || 'offline';
            return (
              <div key={a.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 10px', background: '#0d1117', borderRadius: '4px', marginBottom: '3px',
                fontSize: '12px',
              }}>
                <div style={{ flex: 1 }}>
                  <span style={{ color: '#ccc' }}>{a.name || a.id}</span>
                  <span style={{ color: '#555', fontSize: '10px', marginLeft: '6px' }}>{a.model}</span>
                </div>
                <span style={{
                  color: state === 'working' ? '#4a8' : state === 'blocked' ? '#a44' : '#666',
                  fontSize: '11px', marginRight: '8px',
                }}>
                  {state}
                </span>
                <button
                  style={{
                    background: 'none', border: '1px solid #a44', borderRadius: '3px',
                    color: deleting === a.id ? '#666' : '#a44', fontSize: '10px', padding: '2px 6px',
                    cursor: 'pointer', fontFamily: "'Courier New', monospace",
                  }}
                  disabled={deleting === a.id}
                  onClick={() => handleDelete(a.id)}
                >
                  {deleting === a.id ? '...' : 'x'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ── Cron / Scheduled Tasks (Water Cooler / Coffee) ──
function CronTasksPanel({ agents }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cronName, setCronName] = useState('');
  const [cronSchedule, setCronSchedule] = useState('');
  const [cronMessage, setCronMessage] = useState('');
  const [cronAgent, setCronAgent] = useState('');
  const [adding, setAdding] = useState(false);
  const [result, setResult] = useState(null);
  const [allAgents, setAllAgents] = useState([]);

  const fetchJobs = () => {
    fetch(`${FILE_SERVER}/cron`)
      .then(r => r.json())
      .then(data => { setJobs(data.jobs || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchJobs();
    fetch(`${FILE_SERVER}/agents`).then(r => r.json()).then(setAllAgents).catch(() => {});
  }, []);

  const toggleJob = async (id, enabled) => {
    await fetch(`${FILE_SERVER}/cron-toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, enabled }),
    });
    fetchJobs();
  };

  const deleteJob = async (id) => {
    if (!confirm('Delete this scheduled task?')) return;
    await fetch(`${FILE_SERVER}/cron-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchJobs();
  };

  const addJob = async () => {
    if (!cronName.trim() || !cronSchedule.trim() || !cronMessage.trim()) {
      setResult({ error: 'Name, schedule, and message are required' });
      return;
    }
    setAdding(true);
    setResult(null);
    try {
      const resp = await fetch(`${FILE_SERVER}/cron-add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cronName, schedule: cronSchedule, message: cronMessage, agent: cronAgent || undefined }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed');
      setResult({ ok: true, message: 'Task added' });
      setCronName(''); setCronSchedule(''); setCronMessage(''); setCronAgent('');
      fetchJobs();
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setAdding(false);
    }
  };

  const statusColor = (s) => s === 'ok' ? '#4a8' : s === 'error' ? '#a44' : s === 'skipped' ? '#da8' : '#666';

  function formatSchedule(job) {
    const s = job.schedule;
    if (s?.kind === 'every') {
      const mins = Math.round((s.everyMs || 0) / 60000);
      if (mins < 60) return `every ${mins}m`;
      const hrs = Math.round(mins / 60);
      if (hrs < 24) return `every ${hrs}h`;
      return `every ${Math.round(hrs / 24)}d`;
    }
    if (s?.kind === 'cron') return s.expr || 'cron';
    return '?';
  }

  return (
    <>
      <div style={CARD}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: '#da8' }}>
          Scheduled Tasks ({jobs.length})
        </div>
        {loading && <div style={{ color: '#666', fontSize: '12px' }}>Loading...</div>}
        {jobs.map(j => (
          <div key={j.id} style={{
            padding: '6px 10px', background: '#0d1117', borderRadius: '4px', marginBottom: '4px',
            fontSize: '11px', opacity: j.enabled ? 1 : 0.45,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#ccc', fontSize: '12px' }}>{j.name}</div>
                <div style={{ color: '#666', fontSize: '10px', marginTop: '2px' }}>
                  {formatSchedule(j)} · {j.agentId} · <span style={{ color: statusColor(j.state?.lastStatus) }}>{j.state?.lastStatus || '—'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button
                  style={{ background: 'none', border: `1px solid ${j.enabled ? '#4a8' : '#a44'}`, borderRadius: '3px', color: j.enabled ? '#4a8' : '#a44', fontSize: '10px', padding: '2px 6px', cursor: 'pointer', fontFamily: "'Courier New', monospace" }}
                  onClick={() => toggleJob(j.id, !j.enabled)}
                >
                  {j.enabled ? 'ON' : 'OFF'}
                </button>
                <button
                  style={{ background: 'none', border: '1px solid #a44', borderRadius: '3px', color: '#a44', fontSize: '10px', padding: '2px 6px', cursor: 'pointer', fontFamily: "'Courier New', monospace" }}
                  onClick={() => deleteJob(j.id)}
                >
                  x
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={CARD}>
        <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: '#adf' }}>New Schedule</div>
        <label style={{ fontSize: '11px', color: '#8a8' }}>Name</label>
        <input style={INPUT} value={cronName} onChange={e => setCronName(e.target.value)} placeholder="e.g., Daily Report" />
        <label style={{ fontSize: '11px', color: '#8a8', marginTop: '8px', display: 'block' }}>Schedule</label>
        <input style={INPUT} value={cronSchedule} onChange={e => setCronSchedule(e.target.value)} placeholder="e.g., every 6h  or  0 9 * * 1-5" />
        <div style={{ fontSize: '10px', color: '#555', marginTop: '4px' }}>
          "every 3h" / "every 1d" or cron: min hour day month weekday
        </div>
        <label style={{ fontSize: '11px', color: '#8a8', marginTop: '8px', display: 'block' }}>Agent</label>
        <select style={{ ...INPUT, cursor: 'pointer' }} value={cronAgent} onChange={e => setCronAgent(e.target.value)}>
          <option value="">Default (main)</option>
          {allAgents.map(a => (
            <option key={a.id} value={a.id}>{a.name || a.id}</option>
          ))}
        </select>
        <label style={{ fontSize: '11px', color: '#8a8', marginTop: '8px', display: 'block' }}>Message</label>
        <textarea
          style={{ ...INPUT, height: '60px', resize: 'vertical' }}
          value={cronMessage}
          onChange={e => setCronMessage(e.target.value)}
          placeholder="What should the agent do?"
        />
        <button style={{ ...BTN, opacity: adding ? 0.6 : 1 }} disabled={adding} onClick={addJob}>
          {adding ? 'Adding...' : 'Add Schedule'}
        </button>
        {result && (
          <div style={{
            marginTop: '8px', padding: '8px 10px', borderRadius: '4px', fontSize: '12px',
            background: result.ok ? '#1a2a1f' : '#2a1a1a',
            color: result.ok ? '#4a8' : '#a66',
          }}>
            {result.ok ? result.message : result.error}
          </div>
        )}
      </div>
    </>
  );
}

const PANELS = {
  gateway_token: GatewayPanel,
  create_agent: CreateAgentPanel,
  cron_tasks: CronTasksPanel,
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
