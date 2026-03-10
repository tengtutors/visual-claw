import React from 'react';
import { useStore } from '../lib/store.jsx';
import { STATES, STATE_COLORS } from '../lib/constants.js';

export default function StatusBar() {
  const { agents } = useStore();

  const counts = {};
  for (const s of Object.values(STATES)) {
    counts[s] = 0;
  }
  for (const agent of agents) {
    counts[agent.state] = (counts[agent.state] || 0) + 1;
  }

  return (
    <div className="status-bar">
      <span className="status-total">{agents.length} agents</span>
      <div className="status-pills">
        {Object.entries(counts)
          .filter(([, c]) => c > 0)
          .map(([state, count]) => (
            <span key={state} className="status-pill" style={{ backgroundColor: STATE_COLORS[state] }}>
              {state} {count}
            </span>
          ))}
      </div>
    </div>
  );
}
