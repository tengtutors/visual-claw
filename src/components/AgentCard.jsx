import React, { useState } from 'react';
import { STATE_COLORS, STATES } from '../lib/constants.js';
import { useActions, useStore } from '../lib/store.jsx';

const ROLE_AVATARS = {
  Planner: '📋',
  Developer: '👨‍💻',
  Reviewer: '🔍',
  Designer: '🎨',
  Security: '🔐',
  DevOps: '⚙️',
  Tester: '🧪',
  default: '🤖',
};

export default function AgentCard({ agent, compact = false }) {
  const [showMenu, setShowMenu] = useState(false);
  const { setAgentState, selectAgent } = useActions();
  const { selectedAgentId } = useStore();
  const avatar = ROLE_AVATARS[agent.role] || ROLE_AVATARS.default;
  const stateColor = STATE_COLORS[agent.state] || '#94a3b8';
  const isSelected = selectedAgentId === agent.id;
  const collab = agent.collaboratingWith?.length > 0;

  const handleClick = (e) => {
    e.stopPropagation();
    selectAgent(agent.id);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  return (
    <div
      className={`agent-card ${compact ? 'compact' : ''} state-${agent.state} ${isSelected ? 'agent-selected' : ''}`}
      style={{ '--state-color': stateColor }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      <div className="agent-avatar">
        <span className="avatar-emoji">{avatar}</span>
        <span className="state-dot" style={{ backgroundColor: stateColor }} />
        {isSelected && <span className="selection-ring" />}
      </div>

      <div className="agent-info">
        <div className="agent-name">
          {agent.name}
          {collab && <span className="collab-badge" title="Collaborating">🔗</span>}
        </div>
        <div className="agent-role">
          {agent.classTitle || agent.role}
        </div>
        {!compact && (
          <>
            <div className="agent-state" style={{ color: stateColor }}>
              {agent.state}
            </div>
            {agent.currentTask && <div className="agent-task">{agent.currentTask}</div>}
            {agent.blockedReason && <div className="agent-blocked-reason">⚠ {agent.blockedReason}</div>}
          </>
        )}
      </div>

      {showMenu && (
        <div className="agent-menu" onClick={(e) => e.stopPropagation()}>
          <div className="agent-menu-title">Set State</div>
          {Object.values(STATES).map((s) => (
            <button
              key={s}
              className={`agent-menu-btn ${agent.state === s ? 'active' : ''}`}
              onClick={() => {
                setAgentState(agent.id, s);
                setShowMenu(false);
              }}
            >
              <span className="menu-dot" style={{ backgroundColor: STATE_COLORS[s] }} />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
