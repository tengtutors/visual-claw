// Service worker for OpenClaw Agent Workspace Monitor

// Open side panel on extension icon click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// Handle messages from the UI
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'UPDATE_BADGE') {
    const count = msg.count;
    if (count > 0) {
      chrome.action.setBadgeText({ text: String(count) });
      chrome.action.setBadgeBackgroundColor({ color: '#dc2626' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
    sendResponse({ ok: true });
  }

  if (msg.type === 'AGENT_BLOCKED') {
    chrome.notifications.create(`blocked-${Date.now()}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: 'Agent Blocked',
      message: `${msg.agentName} is blocked: ${msg.reason || 'Unknown reason'}`,
      priority: 2,
    });
    sendResponse({ ok: true });
  }

  if (msg.type === 'OPEN_DASHBOARD') {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
    sendResponse({ ok: true });
  }

  return true; // keep channel open for async response
});

// Context menu to open dashboard
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus?.create({
    id: 'open-dashboard',
    title: 'Open Full Dashboard',
    contexts: ['action'],
  });
});

chrome.contextMenus?.onClicked.addListener((info) => {
  if (info.menuItemId === 'open-dashboard') {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
  }
});
