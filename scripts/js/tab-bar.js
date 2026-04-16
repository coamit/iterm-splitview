// tab-bar.js — Tab switching, loading tabs, file icons, cycling, closing, body listeners
var fv = window.fv;

function activateTab(tabId) {
  document.querySelectorAll('.fv-tab').forEach(function(tab) { tab.classList.remove('active'); });
  document.querySelectorAll('.fv-tab-content').forEach(function(content) { content.classList.remove('active'); });
  var tab = document.querySelector('[data-tab="' + tabId + '"]');
  if (tab) {
    tab.classList.add('active');
    var content = document.getElementById(tabId);
    if (content) { content.classList.add('active'); content.classList.add('fv-reveal'); }
    var tabGroup = tab.getAttribute('data-group');
    if (tabGroup && document.querySelector('.fv-group-bar')) {
      switchTabGroup(tabGroup);
    }
    tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    fvLog('tab_activate', { tabId: tabId, path: tab.getAttribute('title') || '' });
  }
}

function getFileIcon(filename) {
  var codeExtensions = /\.(ts|tsx|js|jsx|mjs|cjs|py|rb|go|rs|java|kt|swift|c|cc|cpp|h|hpp|cs|fs|fsx|sh|bash|zsh|yaml|yml|toml|json|jsonc|sql|graphql|gql|html|css|scss|sass|less|lua|php|r|m|ex|exs|tf|hcl|vue|svelte)$/i;
  var codeNames = /^(Dockerfile|Makefile|Vagrantfile|Procfile|Brewfile)$/;
  var isCode = codeExtensions.test(filename) || codeNames.test(filename);
  return isCode ? '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align:-2px;margin-right:4px;opacity:0.6"><path d="m11.28 3.22 4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L13.94 8l-3.72-3.72a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215Zm-6.56 0a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L2.06 8l3.72 3.72a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L.47 8.53a.75.75 0 0 1 0-1.06Z"/></svg>' : '';
}

function createLoadingTab(filePath) {
  var fname = filePath.split('/').pop();
  var tabBar = document.querySelector('.fv-tab-bar');
  var safeFilename = escapeHtml(fname);
  var tabId = 'fv-tab-loading-' + Date.now();
  var tabIcon = getFileIcon(fname);

  // Create tab header
  var tab = document.createElement('div');
  tab.className = 'fv-tab loading';
  tab.setAttribute('data-tab', tabId);
  tab.setAttribute('title', filePath);
  tab.innerHTML = tabIcon + safeFilename + '<span class="fv-tab-close" data-close-path="' + escapeHtml(filePath) + '">\u00d7</span>';
  tab.setAttribute('data-group', 'files');
  tab.classList.add('fv-group-visible');
  var addFileButton = document.getElementById('fv-add-file');
  if (addFileButton) {
    tabBar.insertBefore(tab, addFileButton);
  } else {
    tabBar.insertBefore(tab, tabBar.querySelector('.fv-tab-spacer'));
  }

  // Create content panel with centered loading spinner
  var panel = document.createElement('div');
  panel.className = 'fv-tab-content';
  panel.id = tabId;
  panel.innerHTML = '<div class="fv-tab-loading-content">Loading ' + safeFilename + '\u2026</div>';
  document.body.appendChild(panel);

  updateGroupCounts();

  // Track last opened file for reliable swap restoration
  fv.lastOpenedFilePath = filePath;

  // Switch to files group and activate the loading tab immediately
  var activeGroup = document.querySelector('.fv-group-sel.active');
  if (activeGroup && activeGroup.getAttribute('data-group') !== 'files') {
    switchTabGroup('files');
  }
  activateTab(tabId);
  history.replaceState(null, '', '#fv-path:' + encodeURIComponent(filePath));

  // Allow clicking back to loading tab if user navigates away
  tab.addEventListener('click', function(e) {
    if (e.target.classList.contains('fv-tab-close')) return;
    activateTab(tabId);
    history.replaceState(null, '', '#fv-path:' + encodeURIComponent(filePath));
  });
}

function navigateToAdjacentTab(direction) {
  var hasGroups = !!document.querySelector('.fv-group-bar');
  var tabs = hasGroups
    ? Array.from(document.querySelectorAll('.fv-tab.fv-group-visible[data-tab]'))
    : Array.from(document.querySelectorAll('.fv-tab[data-tab]'));
  if (tabs.length === 0 && !hasGroups) return;
  var activeIndex = tabs.findIndex(function(tab) { return tab.classList.contains('active'); });

  if (hasGroups) {
    var isAtGroupBoundary = tabs.length === 0 || (direction > 0 && activeIndex >= tabs.length - 1) || (direction < 0 && activeIndex <= 0);
    if (isAtGroupBoundary) {
      var groupSelectors = Array.from(document.querySelectorAll('.fv-group-sel'));
      var activeGroupIndex = groupSelectors.findIndex(function(s) { return s.classList.contains('active'); });
      if (direction > 0 && activeGroupIndex >= groupSelectors.length - 1) return;
      if (direction < 0 && activeGroupIndex <= 0) return;
      for (var i = activeGroupIndex + direction; i >= 0 && i < groupSelectors.length; i += direction) {
        var newGroup = groupSelectors[i].getAttribute('data-group');
        switchTabGroup(newGroup);
        var newTabs = Array.from(document.querySelectorAll('.fv-tab.fv-group-visible[data-tab]'));
        if (newTabs.length > 0) {
          var target = direction > 0 ? newTabs[0] : newTabs[newTabs.length - 1];
          activateTab(target.getAttribute('data-tab'));
          history.replaceState(null, '', '#' + target.getAttribute('data-tab'));
          break;
        }
      }
      fv.currentDiffIdx = -1;
      return;
    }
  }

  if (tabs.length < 2) return;
  var newIndex = activeIndex + direction;
  if (newIndex < 0 || newIndex >= tabs.length) return;
  var newTabId = tabs[newIndex].getAttribute('data-tab');
  activateTab(newTabId);
  history.replaceState(null, '', '#' + newTabId);
  fv.currentDiffIdx = -1;
}

function closeActiveTab() {
  var tab = document.querySelector('.fv-tab.active');
  if (tab && tab.getAttribute('data-group') !== 'git') {
    var closeBtn = tab.querySelector('.fv-tab-close');
    if (closeBtn) closeBtn.click();
  }
}

function getActiveFilePath() {
  var tab = document.querySelector('.fv-tab.active');
  return tab ? tab.getAttribute('title') : '';
}

// eslint-disable-next-line max-lines-per-function
function attachBodyListeners(root) {
  root.querySelectorAll('.fv-tab').forEach(function(tab) {
    tab.addEventListener('click', function(e) {
      if (e.target.classList.contains('fv-tab-close')) return;
      activateTab(tab.getAttribute('data-tab'));
      history.replaceState(null, '', '#' + tab.getAttribute('data-tab'));
    });
  });
  root.querySelectorAll('.fv-tab-close').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var filePath = btn.getAttribute('data-close-path');
      var tab = btn.closest('.fv-tab');
      var tabId = tab.getAttribute('data-tab');
      var content = document.getElementById(tabId);
      var wasActive = tab.classList.contains('active');
      var closedGroup = tab.getAttribute('data-group');
      var groupTabs = Array.from(document.querySelectorAll('.fv-tab[data-group="' + closedGroup + '"][data-tab]'));
      var idx = groupTabs.indexOf(tab);
      var nextTab = idx < groupTabs.length - 1 ? groupTabs[idx + 1] : null;
      var prevTab = idx > 0 ? groupTabs[idx - 1] : null;
      var newActiveTarget = wasActive ? (nextTab || prevTab) : document.querySelector('.fv-tab.active');
      var newActivePath = newActiveTarget ? (newActiveTarget.getAttribute('title') || '') : '';
      tab.remove();
      if (content) content.remove();
      updateGroupCounts();
      if (wasActive && newActiveTarget) {
        activateTab(newActiveTarget.getAttribute('data-tab'));
        history.replaceState(null, '', '#' + newActiveTarget.getAttribute('data-tab'));
      }
      var remainingInGroup = document.querySelectorAll('.fv-tab[data-group="' + closedGroup + '"][data-tab]');
      if (wasActive && remainingInGroup.length === 0) {
        document.querySelectorAll('.fv-tab-content.active').forEach(function(panel) { panel.classList.remove('active'); });
        switchTabGroup(closedGroup);
      }
      fvLog('tab_close', { path: filePath });
      fv.pendingCloses++;
      fetch('/_close?path=' + encodeURIComponent(filePath) + '&active=' + encodeURIComponent(newActivePath))
        .finally(function() { fv.pendingCloses--; fv.lastCloseCompleted = Date.now(); });
    });
  });
  root.querySelectorAll('.fv-group-sel').forEach(function(sel) {
    sel.addEventListener('click', function(e) {
      if (e.target.classList.contains('fv-group-close')) return;
      var group = sel.getAttribute('data-group');
      switchTabGroup(group);
      var wasRestored = false;
      if (fv.groupLastTab[group]) {
        var savedTab = document.querySelector('.fv-tab.fv-group-visible[title="' + escapeCssSelector(fv.groupLastTab[group]) + '"]');
        if (savedTab) {
          activateTab(savedTab.getAttribute('data-tab'));
          wasRestored = true;
        }
      }
      if (!wasRestored) {
        var visibleActive = document.querySelector('.fv-tab.fv-group-visible.active');
        if (!visibleActive) {
          var first = document.querySelector('.fv-tab.fv-group-visible[data-tab]');
          if (first) {
            activateTab(first.getAttribute('data-tab'));
          }
        }
      }
    });
  });
  root.querySelectorAll('.fv-group-close').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      removeWatchedRepository(btn);
    });
  });
  root.querySelectorAll('.fv-md-toggle-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var wrapper = btn.closest('.code-file-wrapper');
      if (!wrapper) return;
      var rawView = wrapper.querySelector('.fv-raw-view');
      var previewView = wrapper.querySelector('.fv-preview-view');
      if (!rawView || !previewView) return;
      var view = btn.getAttribute('data-view');
      rawView.style.display = view === 'raw' ? '' : 'none';
      previewView.style.display = view === 'preview' ? '' : 'none';
      wrapper.querySelectorAll('.fv-md-toggle-btn').forEach(function(toggleBtn) {
        toggleBtn.classList.toggle('active', toggleBtn === btn);
      });
    });
  });
  root.querySelectorAll('.fv-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      fv.currentDiffIdx = -1;
      fv.diffCounterBadge.classList.remove('visible');
      // Update revision panel when switching tabs
      setTimeout(onTabSwitchRefreshRevision, 50);
    });
  });
  root.querySelectorAll('.fv-history-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleRevisionPanel();
    });
  });
  // Toolbar buttons (inside body container, lost on swap)
  var addFileButton = root.querySelector('#fv-add-file');
  if (addFileButton) addFileButton.addEventListener('click', function() { toggleSearchModal('fs-files'); });
  var addGitButton = root.querySelector('#fv-add-git');
  if (addGitButton) addGitButton.addEventListener('click', function() { openGitWatch(); });
  var settingsButton = root.querySelector('#fv-settings-btn');
  if (settingsButton) settingsButton.addEventListener('click', function() { openSettings(); });
  var refreshButton = root.querySelector('#fv-refresh');
  if (refreshButton) refreshButton.addEventListener('click', function() {
    refreshButton.style.opacity = '0.3'; refreshButton.style.pointerEvents = 'none';
    showToast('Refreshing\u2026', true, true);
    fv.lastOpenTriggered = 0;
    fetch('/_refresh');
  });
}
