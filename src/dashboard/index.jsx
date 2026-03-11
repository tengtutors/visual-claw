import React from 'react';
import { createRoot } from 'react-dom/client';
import { StoreProvider, useStore } from '../lib/store.jsx';
import WorkspaceCanvas from '../components/WorkspaceCanvas.jsx';
import EventLog from '../components/EventLog.jsx';
import DemoControls from '../components/DemoControls.jsx';
import StatusBar from '../components/StatusBar.jsx';
import AgentSkillSheet from '../components/AgentSkillSheet.jsx';

function Dashboard() {
  const { events } = useStore();

  return (
    <div className="dashboard">
      <header className="app-header dashboard-header">
        <h1 className="app-title">Visual Claw</h1>
        <DemoControls />
      </header>

      <StatusBar />

      <div className="dashboard-body">
        <div className="dashboard-workspace">
          <WorkspaceCanvas />
        </div>
        <aside className="dashboard-sidebar">
          <EventLog events={events} />
        </aside>
      </div>

      <AgentSkillSheet />
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(
  <StoreProvider>
    <Dashboard />
  </StoreProvider>
);
