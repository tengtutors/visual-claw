import React from 'react';
import LayoutEditorButton from './LayoutEditorButton.jsx';

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

function EditLayoutPanel() {
  return (
    <>
      <div style={CARD}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: '#adf' }}>
          Layout Editor
        </div>
        <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.6' }}>
          Open the layout editor to rearrange furniture, test interactions, and save the office map.
        </div>
        <div style={{ marginTop: '12px' }}>
          <LayoutEditorButton />
        </div>
      </div>
    </>
  );
}

const PANELS = {
  edit_layout: EditLayoutPanel,
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
