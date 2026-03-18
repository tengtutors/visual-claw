import React from 'react';
import { useStore, useActions } from '../lib/store.jsx';

export default function DemoControls() {
  const { demoMode, connectionStatus, openclawStatus } = useStore();
  const { toggleDemoMode, simulateChange } = useActions();

  return (
    <div className="demo-controls">
      <div className="demo-row">
        <label className="toggle-label">
          <input type="checkbox" checked={demoMode} onChange={toggleDemoMode} />
          <span className="toggle-slider" />
          Demo Mode
        </label>

        <span className={`conn-status conn-${connectionStatus}`}>
          {demoMode ? 'Demo' : connectionStatus === 'ws' ? 'WS' : connectionStatus === 'polling' ? 'Poll' : 'Off'}
        </span>
        {!demoMode && (
          <span className={`conn-status conn-${openclawStatus}`} title="OpenClaw connection">
            {openclawStatus === 'ws' ? 'OC:WS' : openclawStatus === 'polling' ? 'OC:Poll' : 'OC:Off'}
          </span>
        )}
      </div>

      {demoMode && (
        <div className="demo-buttons">
          <button className="btn btn-sim" onClick={simulateChange}>
            Simulate Change
          </button>
        </div>
      )}

      {!demoMode && connectionStatus === 'disconnected' && openclawStatus === 'disconnected' && (
        <div className="connect-banner">
          <code>openclaw gateway --auth password --password claw</code>
        </div>
      )}
    </div>
  );
}
