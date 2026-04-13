// shortcuts.js — Keyboard shortcut dispatch map + handler
var fv = window.fv;

var shortcutMap = {
  't': function() { window.scrollTo({ top: 0, behavior: 'smooth' }); },
  'b': function() { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); },
  'f': function() { toggleModal('text-active'); },
  'g': function() { toggleModal('text'); },
  'h': function() { toggleModal('fs-text'); },
  'o': function() { toggleModal('fs-files'); },
  'p': function() { toggleModal('files'); },
  's': function() { /* no-op: prevent default */ },
  'i': function() {
    if (fv.gitWatchOverlay && fv.gitWatchOverlay.classList.contains('visible')) closeGitWatch();
    else openGitWatch();
  },
  '/': function() {
    if (fv.settingsOverlay.classList.contains('visible')) closeSettings();
    else openSettings();
  },
  '?': function() {
    if (fv.settingsOverlay.classList.contains('visible')) closeSettings();
    else openSettings();
  },
  'd': function() { jumpToDiff(1); },
  'x': function() { toggleDiffCollapse(); },
  'e': function() { toggleMdView(); },
  'c': function() { var fp = getActiveFilePath(); if (fp) copyToClipboard(fp); },
  'j': function() {
    var fp = getActiveFilePath();
    if (fp) { fetch('/_open-in-editor?path=' + encodeURIComponent(fp)); showToast('Opened file in Cursor \u2713'); }
  },
  'k': function() {
    var fp = getActiveFilePath();
    if (fp) { fetch('/_open-workspace?path=' + encodeURIComponent(fp)); showToast('Opened workspace in Cursor \u2713'); }
  },
  ']': function() { cycleTab(1); },
  '[': function() { cycleTab(-1); },
  'w': function() { closeActiveTab(); }
};

document.addEventListener('keydown', function(e) {
  if (e.ctrlKey) {
    var handler = shortcutMap[e.key];
    if (handler) {
      e.preventDefault();
      handler();
      return;
    }
  }
  if (fv.gitWatchOverlay && fv.gitWatchOverlay.classList.contains('visible')) {
    if (e.key === 'Escape') { closeGitWatch(); e.preventDefault(); }
    return;
  }
  if (fv.settingsOverlay.classList.contains('visible')) {
    if (e.key === 'Escape') { closeSettings(); e.preventDefault(); }
    return;
  }
  if (!fv.modalOverlay.classList.contains('visible')) return;
  if (e.key === 'Escape') { closeModal(); e.preventDefault(); }
  if (e.key === 'ArrowDown') { fv.modalSelectedIdx = Math.min(fv.modalSelectedIdx + 1, fv.modalItems.length - 1); updateModalSelection(); e.preventDefault(); }
  if (e.key === 'ArrowUp') { fv.modalSelectedIdx = Math.max(fv.modalSelectedIdx - 1, 0); updateModalSelection(); e.preventDefault(); }
  if (e.key === 'Enter') { selectModalItem(); e.preventDefault(); }
});
