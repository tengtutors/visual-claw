import React from 'react';

function openAvatarEditor() {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    window.open(chrome.runtime.getURL('tools/avatar-editor.html'), '_blank');
    return;
  }
  window.open('../tools/avatar-editor.html', '_blank');
}

export default function AvatarEditorButton({ compact = false }) {
  return (
    <button
      className={`btn btn-layout${compact ? ' btn-sm' : ''}`}
      onClick={openAvatarEditor}
      title="Open avatar editor"
    >
      Edit Avatars
    </button>
  );
}
