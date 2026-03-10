// Suppress benign ResizeObserver loop error in Chrome extensions
window.addEventListener('error', function(e) {
  if (e.message && e.message.includes('ResizeObserver loop')) {
    e.stopImmediatePropagation();
  }
});
