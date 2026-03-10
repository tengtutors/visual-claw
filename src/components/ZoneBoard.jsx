import React from 'react';
import { ZONES, ZONE_META } from '../lib/constants.js';
import AgentCard from './AgentCard.jsx';

function Zone({ zoneId, agents, compact }) {
  const meta = ZONE_META[zoneId];

  return (
    <div className={`zone zone-${zoneId}`}>
      <div className="zone-header" style={{ borderColor: meta.color }}>
        <span className="zone-emoji">{meta.emoji}</span>
        <span className="zone-label">{meta.label}</span>
        <span className="zone-count">{agents.length}</span>
      </div>
      <div className="zone-agents">
        {agents.length === 0 && <div className="zone-empty">No agents</div>}
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} compact={compact} />
        ))}
      </div>
    </div>
  );
}

export default function ZoneBoard({ agents, compact = false }) {
  const grouped = {
    [ZONES.WORK]: [],
    [ZONES.REST]: [],
    [ZONES.MEETING]: [],
    [ZONES.BLOCKED]: [],
  };

  for (const agent of agents) {
    const zone = agent.zone || ZONES.REST;
    if (grouped[zone]) {
      grouped[zone].push(agent);
    } else {
      grouped[ZONES.REST].push(agent);
    }
  }

  return (
    <div className="zone-board">
      {Object.keys(grouped).map((zoneId) => (
        <Zone key={zoneId} zoneId={zoneId} agents={grouped[zoneId]} compact={compact} />
      ))}
    </div>
  );
}
