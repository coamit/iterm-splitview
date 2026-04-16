// app.js — DOM refs, pollers start, hash restore, group init, mermaid init, page reveal, event wiring
var fv = window.fv;

// --- Acquire DOM refs ---
fv.themeStyleEl = document.createElement('style');
fv.themeStyleEl.id = 'fv-theme-override';
document.head.appendChild(fv.themeStyleEl);

fv.settingsOverlay = document.getElementById('fv-settings-overlay');
fv.themeGrid = document.getElementById('fv-theme-grid');
fv.settingsSectionTitle = document.getElementById('fv-settings-section-title');
fv.gitWatchOverlay = document.getElementById('fv-git-watch-overlay');
fv.gitWatchInput = document.getElementById('fv-git-watch-input');
fv.gitWatchBtn = document.getElementById('fv-git-watch-btn');
fv.gitWatchStatus = document.getElementById('fv-git-watch-status');
fv.gitModeBranch = document.getElementById('fv-git-mode-branch');
fv.gitModeLocal = document.getElementById('fv-git-mode-local');
fv.diffCounterBadge = document.getElementById('diff-counter-badge');
fv.toastEl = document.getElementById('fv-toast');
fv.tsEl = document.getElementById('fv-ts');
fv.modalOverlay = document.getElementById('fv-modal-overlay');
fv.modalInput = document.getElementById('fv-modal-input');
fv.modalList = document.getElementById('fv-modal-list');
fv.modalModeEl = document.getElementById('fv-modal-mode');
fv.modalModeText = document.getElementById('fv-modal-mode-text');
fv.modalRootEl = document.getElementById('fv-modal-root');

// --- Apply saved theme (synchronous from embedded data attribute) ---
var themeMarker = document.querySelector('[data-fv-theme]');
var savedTheme = themeMarker ? themeMarker.getAttribute('data-fv-theme') : '';
if (savedTheme && themes[savedTheme]) {
  applyTheme(savedTheme);
}

// Switch hljs theme for light mode
if (!fv.isDark) {
  document.getElementById('hljs-dark-theme').href = HLJS_CDN_BASE + 'atom-one-light.min.css';
}

// --- Read metadata marker ---
var marker = document.querySelector('[data-fv-gen]');
fv.genTime = marker ? marker.getAttribute('data-fv-gen') : null;
fv.tabCount = marker ? parseInt(marker.getAttribute('data-fv-tabs') || '0', 10) : 0;
var timeMarker = document.querySelector('[data-fv-time]');
fv.tsGenEpoch = timeMarker ? parseInt(timeMarker.getAttribute('data-fv-time'), 10) : 0;

// --- Settings modal wiring ---
document.getElementById('fv-settings-close').addEventListener('click', closeSettings);
fv.settingsOverlay.addEventListener('click', function(e) {
  if (e.target === fv.settingsOverlay) closeSettings();
});
document.querySelectorAll('.fv-settings-nav-item').forEach(function(el) {
  el.addEventListener('click', function() { switchSettingsSection(el.getAttribute('data-section')); });
});
fv.themeGrid.addEventListener('click', function(e) {
  var card = e.target.closest('.fv-theme-card');
  if (card && card.closest('#fv-settings-pane-appearance')) {
    applyTheme(card.getAttribute('data-theme'));
    renderThemeGrid();
  }
});

// + buttons (top-level, not lost on swap)
var addFileButton = document.getElementById('fv-add-file');
if (addFileButton) addFileButton.addEventListener('click', function() { toggleSearchModal('fs-files'); });
var addGitButton = document.getElementById('fv-add-git');
if (addGitButton) addGitButton.addEventListener('click', function() { openGitWatch(); });
var settingsButton = document.getElementById('fv-settings-btn');
if (settingsButton) settingsButton.addEventListener('click', function() { openSettings(); });

// Git mode buttons (inside settings)
if (fv.gitModeBranch) fv.gitModeBranch.addEventListener('click', function() {
  if (fv.gitModeBranch.classList.contains('active')) return;
  updateGitModeUI('branch');
  closeSettings();
  showGitLoading('branch changes');
  fv.lastOpenTriggered = Date.now();
  fetch('/_git-settings?diff_mode=branch');
});
if (fv.gitModeLocal) fv.gitModeLocal.addEventListener('click', function() {
  if (fv.gitModeLocal.classList.contains('active')) return;
  updateGitModeUI('local');
  closeSettings();
  showGitLoading('local changes');
  fv.lastOpenTriggered = Date.now();
  fetch('/_git-settings?diff_mode=local');
});

// Git watch modal wiring
document.getElementById('fv-git-watch-close').addEventListener('click', closeGitWatch);
fv.gitWatchOverlay.addEventListener('click', function(e) {
  if (e.target === fv.gitWatchOverlay) closeGitWatch();
});

// Refresh button
var refreshButton = document.getElementById('fv-refresh');
if (refreshButton) {
  refreshButton.addEventListener('click', function() {
    refreshButton.style.opacity = '0.3';
    refreshButton.style.pointerEvents = 'none';
    showToast('Refreshing\u2026', true, true);
    fv.lastOpenTriggered = 0;
    fetch('/_refresh');
  });
}

// Git watch submit
if (fv.gitWatchBtn && fv.gitWatchInput) {
  fv.gitWatchBtn.addEventListener('click', function() {
    var path = fv.gitWatchInput.value.trim();
    if (!path) return;
    if (fv.gitWatchStatus) fv.gitWatchStatus.textContent = 'Adding...';
    fetch('/_git-settings?watch=' + encodeURIComponent(path))
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.error) {
          if (fv.gitWatchStatus) fv.gitWatchStatus.textContent = data.error;
        } else if (data.already_watching) {
          if (fv.gitWatchStatus) fv.gitWatchStatus.textContent = 'Already watching ' + data.already_watching;
        } else if (data.added) {
          if (fv.gitWatchStatus) fv.gitWatchStatus.textContent = '';
          fv.gitWatchInput.value = '';
          closeGitWatch();
          var groupName = 'git.' + data.added;
          createGroupHeader(groupName, data.added);
          var loadPanelId = 'fv-loading-' + groupName.replace(/\./g, '-');
          var loadPanel = document.createElement('div');
          loadPanel.className = 'fv-tab-content';
          loadPanel.id = loadPanelId;
          loadPanel.setAttribute('data-loading-group', groupName);
          loadPanel.innerHTML = '<div class="fv-tab-loading-content">Loading ' + escapeHtml(data.added) + ' changes\u2026</div>';
          document.body.appendChild(loadPanel);
          fv.loadingGroups[groupName] = loadPanelId;
          switchTabGroup(groupName);
          history.replaceState(null, '', '#fv-group:' + groupName);
        }
      });
  });
  fv.gitWatchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); fv.gitWatchBtn.click(); }
  });
}

// Modal root click
fv.modalRootEl.addEventListener('click', function(e) {
  e.stopPropagation();
  startEditSearchRoot();
});

// Modal input handler
fv.modalInput.addEventListener('input', function() {
  fv.modalSelectedIdx = 0;
  if (fv.modalMode === 'fs-text' || fv.modalMode === 'fs-files') {
    clearTimeout(fv.searchTimer);
    fv.searchTimer = setTimeout(function() { renderSearchModal(fv.modalInput.value); }, SEARCH_DEBOUNCE_FS_MS);
  } else if (fv.modalMode === 'text' || fv.modalMode === 'text-active') {
    clearTimeout(fv.searchTimer);
    fv.searchTimer = setTimeout(function() { renderSearchModal(fv.modalInput.value); }, SEARCH_DEBOUNCE_TEXT_MS);
  } else {
    renderSearchModal(fv.modalInput.value);
  }
});

// Modal list click
fv.modalList.addEventListener('click', function(e) {
  var li = e.target.closest('.fv-modal-item');
  if (li) { fv.modalSelectedIdx = parseInt(li.getAttribute('data-idx'), 10); selectModalItem(); }
});

// Modal overlay click
fv.modalOverlay.addEventListener('click', function(e) {
  if (e.target === fv.modalOverlay) closeSearchModal();
});

// --- Initialize content ---
var bodyContainer = document.getElementById('fv-body-container');
initializeContent(bodyContainer);
attachBodyListeners(bodyContainer);

// --- Mermaid init ---
mermaid.initialize({ startOnLoad: true, theme: fv.isDark ? 'dark' : 'default' });

// --- Loading toast (dynamically created) ---
fv.loadingToast = document.createElement('div');
fv.loadingToast.id = 'fv-loading';
fv.loadingToast.className = 'fv-loading-toast';
fv.loadingToast.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);border-radius:8px;padding:8px 16px;display:none;align-items:center;gap:8px;z-index:999';
fv.loadingToast.innerHTML = '<div class="fv-loading-toast-spinner" style="width:14px;height:14px;border-radius:50%;animation:fvspin 0.8s linear infinite"></div><span class="fv-loading-toast-text" style="font-size:12px;font-family:-apple-system,sans-serif">Loading...</span>';
var spinnerStyle = document.createElement('style');
spinnerStyle.textContent = '@keyframes fvspin{to{transform:rotate(360deg)}}';
document.body.appendChild(spinnerStyle);
document.body.appendChild(fv.loadingToast);

// --- Hash restore (one-time) ---
var hash = window.location.hash.substring(1);
if (hash && hash.indexOf('fv-group:') === 0) {
  var targetGroup = hash.substring('fv-group:'.length);
  var targetGroupSelector = document.querySelector('.fv-group-sel[data-group="' + targetGroup + '"]');
  if (targetGroupSelector) {
    switchTabGroup(targetGroup);
    var firstTab = document.querySelector('.fv-tab.fv-group-visible[data-tab]');
    if (firstTab) {
      activateTab(firstTab.getAttribute('data-tab'));
    }
  }
  history.replaceState(null, '', window.location.pathname);
} else if (hash && hash.indexOf('fv-path:') === 0) {
  var targetPath = decodeURIComponent(hash.substring('fv-path:'.length));
  var matchTab = document.querySelector('.fv-tab[title="' + escapeCssSelector(targetPath) + '"]');
  if (matchTab) {
    var matchGroup = matchTab.getAttribute('data-group');
    if (matchGroup && document.querySelector('.fv-group-bar')) {
      switchTabGroup(matchGroup);
    }
    activateTab(matchTab.getAttribute('data-tab'));
  }
  history.replaceState(null, '', window.location.pathname);
} else if (hash && document.getElementById(hash) && document.querySelector('[data-tab="' + hash + '"]')) {
  activateTab(hash);
}

// --- Init diffs, then reveal content ---
initializeDiffCollapse(bodyContainer);
var initHideStyle = document.getElementById('fv-init-hide');
if (initHideStyle) initHideStyle.remove();
var pageLoader = document.getElementById('fv-page-loader');
if (pageLoader) pageLoader.remove();
var activeContent = document.querySelector('.fv-tab-content.active');
if (activeContent) activeContent.classList.add('fv-reveal');

// --- Group bar init ---
var groupBar = document.querySelector('.fv-group-bar');
var hashHandledGroup = hash && hash.indexOf('fv-group:') === 0;
if (groupBar && !hashHandledGroup) {
  var activeGroupSelector = document.querySelector('.fv-group-sel.active');
  if (activeGroupSelector) switchTabGroup(activeGroupSelector.getAttribute('data-group'));
}

// --- Start all pollers ---
startLoadingPoll();
startReloadPoll();
startTimestampPoll();
_startLogFlusher();
fvLog('page_load', { tabCount: fv.tabCount });

// --- Flush logs before tab closes ---
window.addEventListener('beforeunload', function() { _stopLogFlusher(); });

// --- Visibility change handler ---
document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    stopAllPollers();
    _stopLogFlusher();
  } else {
    startLoadingPoll();
    startReloadPoll();
    startTimestampPoll();
    _startLogFlusher();
  }
});
