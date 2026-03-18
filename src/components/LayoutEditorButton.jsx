import React from 'react';

function openLayoutEditor() {
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ type: 'OPEN_LAYOUT_EDITOR' }).catch(() => {
      if (chrome.runtime?.getURL) {
        window.open(chrome.runtime.getURL('tools/interior-design.html'), '_blank');
      }
    });
    return;
  }

  window.open('../tools/interior-design.html', '_blank');
}

export default function LayoutEditorButton({ compact = false }) {
  return (
    <button
      className={`btn btn-layout${compact ? ' btn-sm' : ''}`}
      onClick={openLayoutEditor}
      title="Open layout editor"
    >
      Edit Layout
    </button>
  );
}
