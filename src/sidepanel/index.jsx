import React from 'react';
import { createRoot } from 'react-dom/client';
import { StoreProvider, useStore } from '../lib/store.jsx';
import WorkspaceCanvas from '../components/WorkspaceCanvas.jsx';
import EventLog from '../components/EventLog.jsx';
import DemoControls from '../components/DemoControls.jsx';
import StatusBar from '../components/StatusBar.jsx';
import AgentSkillSheet from '../components/AgentSkillSheet.jsx';

function SidePanel() {
  const { events } = useStore();

  const openDashboard = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' }).catch(() => {
        window.open(chrome.runtime.getURL('dashboard/dashboard.html'), '_blank');
      });
    }
  };

  return (
    <div className="sidepanel">
      <header className="app-header">
        <h1 className="app-title">Visual Claw</h1>
        <button className="btn btn-sm btn-dash" onClick={openDashboard} title="Open full dashboard">
          ↗
        </button>
      </header>

      <DemoControls />
      <StatusBar />
      <WorkspaceCanvas />
      <EventLog events={events} />
      <AgentSkillSheet />
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(
  <StoreProvider>
    <SidePanel />
  </StoreProvider>
);
