import React, { useEffect, useRef, useState, useCallback } from 'react';
import { STATE_COLORS } from '../lib/constants.js';
import { useSelectedAgent, useActions, useStore } from '../lib/store.jsx';
import { drawCharacterPortrait, getCharacterKey } from '../pixi/utils/characters.js';

const FILE_SERVER = 'http://127.0.0.1:18790';

const ROLE_AVATARS = {
  Planner: '📋', Developer: '👨‍💻', Reviewer: '🔍', Designer: '🎨',
  Security: '🔐', DevOps: '⚙️', Tester: '🧪', default: '🤖',
};

const TOOL_ICONS = {
  github: '🐙', docker: '🐳', postgres: '🐘', browser: '🌐',
  python: '🐍', nodejs: '📗', shell: '💻', slack: '💬',
  email: '📧', calendar: '📅',
};

const SKILL_LABELS = {
  coding: 'Coding', debugging: 'Debugging', apiIntegration: 'API Integration',
  securityAnalysis: 'Security Analysis', deployment: 'Deployment', uiDesign: 'UI Design',
  planning: 'Planning', review: 'Review', routing: 'Routing', research: 'Research',
};

const HEALTH_MAP = {
  good: { label: 'Good', color: '#22c55e', icon: '💚' },
  stressed: { label: 'Stressed', color: '#f59e0b', icon: '💛' },
  resting: { label: 'Resting', color: '#94a3b8', icon: '💤' },
};

const EVENT_ICONS = {
  task_assigned: '📥', task_started: '▶️', task_completed: '🏁',
  blocked: '🚫', unblocked: '✅', collaboration_started: '🤝',
  handoff: '🔄', review_completed: '📝',
};

function skillRank(val) {
  if (val >= 90) return { rank: 'S', color: '#fbbf24' };
  if (val >= 75) return { rank: 'A', color: '#22c55e' };
  if (val >= 55) return { rank: 'B', color: '#38bdf8' };
  return { rank: 'C', color: '#94a3b8' };
}

function formatDuration(startIso) {
  if (!startIso) return '--';
  const ms = Date.now() - new Date(startIso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

function formatMs(ms) {
  if (!ms) return '--';
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.round(secs / 60);
  return `${mins}m`;
}

function formatTime(isoOrTs) {
  const d = new Date(isoOrTs);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function SkillBar({ name, value }) {
  const { rank, color } = skillRank(value);
  return (
    <div className="rpg-skill-row">
      <span className="rpg-skill-name">{SKILL_LABELS[name] || name}</span>
      <div className="rpg-skill-bar-track">
        <div className="rpg-skill-bar-fill" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="rpg-skill-rank" style={{ color }}>{rank}</span>
      <span className="rpg-skill-val">{value}</span>
    </div>
  );
}

function FileViewer({ agentId, fileName, title }) {
  const [content, setContent] = useState(null);
  const [editContent, setEditContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saveMsg, setSaveMsg] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);

  const fetchFile = useCallback(() => {
    if (loading) return;
    setLoading(true);
    setError(null);
    fetch(`${FILE_SERVER}/file?agent=${encodeURIComponent(agentId)}&path=${encodeURIComponent(fileName)}`)
      .then(r => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then(data => {
        setContent(data.content);
        setEditContent(data.content);
        setExpanded(true);
      })
      .catch(() => setError('Could not load. Run: node tools/workspace-file-server.js'))
      .finally(() => setLoading(false));
  }, [agentId, fileName, loading]);

  const saveFile = useCallback(() => {
    if (saving) return;
    setSaving(true);
    setSaveMsg(null);
    fetch(`${FILE_SERVER}/file?agent=${encodeURIComponent(agentId)}&path=${encodeURIComponent(fileName)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent }),
    })
      .then(r => {
        if (!r.ok) return r.json().then(d => { throw new Error(d.error); });
        return r.json();
      })
      .then(() => {
        setContent(editContent);
        setEditing(false);
        setSaveMsg('Saved');
        setTimeout(() => setSaveMsg(null), 2000);
      })
      .catch(err => setSaveMsg(`Error: ${err.message}`))
      .finally(() => setSaving(false));
  }, [agentId, fileName, editContent, saving]);

  return (
    <div className="rpg-section">
      <div
        className="rpg-section-title"
        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        onClick={() => {
          if (!content && !error) fetchFile();
          else setExpanded(!expanded);
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: '11px', color: '#64748b' }}>
          {loading ? 'loading...' : expanded ? '▼' : '▶'}
        </span>
      </div>
      {error && (
        <div style={{ fontSize: '11px', color: '#f59e0b', padding: '6px 0' }}>{error}</div>
      )}
      {expanded && content != null && !editing && (
        <>
          <pre style={{
            fontSize: '13px',
            lineHeight: '1.6',
            color: '#c9d1d9',
            background: '#0d1117',
            padding: '12px',
            borderRadius: '6px',
            overflow: 'auto',
            maxHeight: '400px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            margin: '4px 0 0',
            border: '1px solid #21262d',
          }}>{content}</pre>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
            <button
              className="rpg-tool-badge"
              style={{ cursor: 'pointer', border: '1px solid #3a5', background: '#1a2a1f', fontSize: '11px', padding: '3px 10px' }}
              onClick={(e) => { e.stopPropagation(); setEditContent(content); setEditing(true); }}
            >
              Edit
            </button>
            <button
              className="rpg-tool-badge"
              style={{ cursor: 'pointer', border: '1px solid #335', background: '#1a1f35', fontSize: '11px', padding: '3px 10px' }}
              onClick={(e) => { e.stopPropagation(); fetchFile(); }}
            >
              Reload
            </button>
            {saveMsg && (
              <span style={{ fontSize: '11px', color: saveMsg === 'Saved' ? '#22c55e' : '#f59e0b' }}>{saveMsg}</span>
            )}
          </div>
        </>
      )}
      {expanded && editing && (
        <>
          <textarea
            style={{
              width: '100%',
              minHeight: '300px',
              height: '400px',
              fontSize: '13px',
              lineHeight: '1.6',
              color: '#c9d1d9',
              background: '#0d1117',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid #3a5',
              resize: 'vertical',
              fontFamily: "'Courier New', monospace",
              margin: '4px 0 0',
              boxSizing: 'border-box',
            }}
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            onClick={e => e.stopPropagation()}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <button
              style={{
                cursor: 'pointer', border: 'none', background: '#22c55e', color: '#000',
                fontSize: '11px', padding: '4px 14px', borderRadius: '4px', fontWeight: 'bold',
                fontFamily: "'Courier New', monospace",
              }}
              onClick={(e) => { e.stopPropagation(); saveFile(); }}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              style={{
                cursor: 'pointer', border: '1px solid #444', background: 'transparent', color: '#888',
                fontSize: '11px', padding: '4px 14px', borderRadius: '4px',
                fontFamily: "'Courier New', monospace",
              }}
              onClick={(e) => { e.stopPropagation(); setEditing(false); setEditContent(content); }}
            >
              Cancel
            </button>
            {saveMsg && (
              <span style={{ fontSize: '11px', color: saveMsg === 'Saved' ? '#22c55e' : '#f59e0b', alignSelf: 'center' }}>{saveMsg}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function AgentSkillSheet() {
  const agent = useSelectedAgent();
  const { agents } = useStore();
  const { deselectAgent, setAgentState } = useActions();
  const panelRef = useRef(null);
  const previewCanvasRef = useRef(null);

  // Draw matching portrait from the same Metro City sheet used on the map
  useEffect(() => {
    if (!agent || !previewCanvasRef.current) return;

    const canvas = previewCanvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 80 * dpr;
    canvas.height = 90 * dpr;
    canvas.style.width = '80px';
    canvas.style.height = '90px';

    drawCharacterPortrait(canvas, getCharacterKey(agent), { scale: 2 * dpr, offsetY: 6 * dpr }).catch((error) => {
      console.error('Failed to draw character portrait', error);
    });
  }, [agent]);

  // Close on click outside
  useEffect(() => {
    if (!agent) return;
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        // Check if click was on an agent card or workspace canvas (let those handle selection)
        if (e.target.closest('.agent-card') || e.target.closest('.workspace-canvas')) return;
        deselectAgent();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [agent, deselectAgent]);

  if (!agent) return null;

  const avatar = ROLE_AVATARS[agent.role] || ROLE_AVATARS.default;
  const stateColor = STATE_COLORS[agent.state] || '#94a3b8';
  const healthInfo = HEALTH_MAP[agent.health] || HEALTH_MAP.good;

  // Resolve collaborator names
  const collabNames = (agent.collaboratingWith || [])
    .map((cid) => agents.find((a) => a.id === cid)?.name || cid)
    .join(', ');

  const skills = agent.skills || {};
  const sortedSkills = Object.entries(skills).sort((a, b) => b[1] - a[1]);
  const tools = agent.tools || [];
  const recentEvents = (agent.recentEvents || []).slice(0, 10);

  return (
    <div className="rpg-overlay">
      <div className="rpg-skill-sheet" ref={panelRef} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Close button */}
        <button className="rpg-close" onClick={deselectAgent}>✕</button>

        {/* ─── Character Header ─── */}
        <div className="rpg-header">
          <div className="rpg-avatar-frame">
            <canvas ref={previewCanvasRef} className="rpg-preview-canvas" />
            <span className="rpg-state-ring" style={{ borderColor: stateColor }} />
          </div>
          <div className="rpg-header-info">
            <div className="rpg-name">{agent.name}</div>
            <div className="rpg-class">{agent.classTitle || agent.role}</div>
            <div className="rpg-role-tag">{agent.role}</div>
            <div className="rpg-header-row">
              <span className="rpg-state-badge" style={{ backgroundColor: stateColor }}>{agent.state}</span>
              <span className="rpg-health">{healthInfo.icon} {healthInfo.label}</span>
            </div>
            {agent.level != null && (
              <div className="rpg-level">LV {agent.level} <span className="rpg-xp">({agent.xp || 0} XP)</span></div>
            )}
          </div>
        </div>

        {/* Current task info */}
        {agent.currentTaskTitle && (
          <div className="rpg-section rpg-task-section">
            <div className="rpg-section-title">Current Quest</div>
            <div className="rpg-task-name">{agent.currentTaskTitle}</div>
            <div className="rpg-task-meta">
              <span>Time: {formatDuration(agent.startedCurrentTaskAt)}</span>
              <span>Zone: {agent.zone}</span>
            </div>
          </div>
        )}

        {/* ─── Current Action ─── */}
        <div className="rpg-section">
          <div className="rpg-section-title">Status</div>
          <div className="rpg-stats-grid">
            {agent.lastAction && (
              <div className="rpg-stat-item">
                <span className="rpg-stat-label">Last Action</span>
                <span className="rpg-stat-value">{agent.lastAction}</span>
              </div>
            )}
            {collabNames && (
              <div className="rpg-stat-item">
                <span className="rpg-stat-label">Party</span>
                <span className="rpg-stat-value">{collabNames}</span>
              </div>
            )}
            {agent.blockedReason && (
              <div className="rpg-stat-item rpg-stat-blocked">
                <span className="rpg-stat-label">Blocked</span>
                <span className="rpg-stat-value">{agent.blockedReason}</span>
              </div>
            )}
            <div className="rpg-stat-item">
              <span className="rpg-stat-label">Last Updated</span>
              <span className="rpg-stat-value">{agent.lastUpdated ? formatTime(agent.lastUpdated) : '--'}</span>
            </div>
          </div>
        </div>

        {/* ─── Performance Metrics ─── */}
        <div className="rpg-section">
          <div className="rpg-section-title">Battle Record</div>
          <div className="rpg-metrics">
            <div className="rpg-metric">
              <span className="rpg-metric-val">{agent.tasksCompleted ?? '--'}</span>
              <span className="rpg-metric-label">Quests Done</span>
            </div>
            <div className="rpg-metric">
              <span className="rpg-metric-val">{formatMs(agent.avgCompletionMs)}</span>
              <span className="rpg-metric-label">Avg Time</span>
            </div>
            <div className="rpg-metric">
              <span className="rpg-metric-val">{agent.totalBlocks ?? '--'}</span>
              <span className="rpg-metric-label">Blocks</span>
            </div>
            <div className="rpg-metric">
              <span className="rpg-metric-val">{agent.collaborationCount ?? '--'}</span>
              <span className="rpg-metric-label">Co-ops</span>
            </div>
            <div className="rpg-metric">
              <span className="rpg-metric-val">
                {agent.successRate != null ? `${Math.round(agent.successRate * 100)}%` : '--'}
              </span>
              <span className="rpg-metric-label">Success</span>
            </div>
          </div>
        </div>

        {/* ─── Recent Events ─── */}
        {recentEvents.length > 0 && (
          <div className="rpg-section">
            <div className="rpg-section-title">Adventure Log</div>
            <div className="rpg-event-list">
              {recentEvents.map((evt, i) => (
                <div key={i} className="rpg-event-row">
                  <span className="rpg-event-icon">{EVENT_ICONS[evt.type] || '📌'}</span>
                  <span className="rpg-event-label">{evt.label}</span>
                  <span className="rpg-event-time">{formatTime(evt.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Soul & Identity Files ─── */}
        <FileViewer agentId={agent.id.replace(/^bot-/, '')} fileName="SOUL.md" title="Soul" />
        <FileViewer agentId={agent.id.replace(/^bot-/, '')} fileName="IDENTITY.md" title="Identity" />
      </div>
    </div>
  );
}
