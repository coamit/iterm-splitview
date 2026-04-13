// group-bar.js — Group switching, counts, loading states, unwatch, group headers, polling
var fv = window.fv;

function switchTabGroup(groupName) {
  // Save current group's active tab before switching
  var currentGroupSelector = document.querySelector('.fv-group-sel.active');
  if (currentGroupSelector) {
    var currentGroup = currentGroupSelector.getAttribute('data-group');
    var currentActiveTab = document.querySelector('.fv-tab.active[data-group="' + currentGroup + '"]');
    if (currentActiveTab) fv.groupLastTab[currentGroup] = currentActiveTab.getAttribute('title');
  }
  document.querySelectorAll('.fv-group-sel').forEach(function(sel) {
    sel.classList.toggle('active', sel.getAttribute('data-group') === groupName);
  });
  // Show only tabs from active group
  document.querySelectorAll('.fv-tab-bar .fv-tab[data-group]').forEach(function(tab) {
    tab.classList.toggle('fv-group-visible', tab.getAttribute('data-group') === groupName);
  });
  // Show + button only for files group
  var addBtn = document.getElementById('fv-add-file');
  if (addBtn) addBtn.style.display = (groupName === 'files') ? '' : 'none';
  // Hide all loading panels, show the one for this group if loading
  document.querySelectorAll('[data-loading-group]').forEach(function(panel) { panel.classList.remove('active'); });
  var existingEmpty = document.getElementById('fv-group-empty');
  if (existingEmpty) existingEmpty.remove();

  // Check if this group is in loading state
  if (fv.loadingGroups[groupName]) {
    document.querySelectorAll('.fv-tab-content.active').forEach(function(content) { content.classList.remove('active'); });
    var loadingPanel = document.getElementById(fv.loadingGroups[groupName]);
    if (loadingPanel) loadingPanel.classList.add('active');
    return;
  }

  var hasVisibleTabs = document.querySelector('.fv-tab.fv-group-visible[data-tab]');
  if (!hasVisibleTabs) {
    document.querySelectorAll('.fv-tab-content.active').forEach(function(content) { content.classList.remove('active'); });
    var emptyDiv = document.createElement('div');
    emptyDiv.className = 'fv-tab-content active fv-empty-state';
    emptyDiv.id = 'fv-group-empty';
    var isGit = groupName.indexOf('git.') === 0;
    var msg = isGit ? 'No changes on this branch' : 'Press Ctrl+O to open a file';
    emptyDiv.style.cssText = 'display:flex;align-items:center;justify-content:center;min-height:calc(100vh - 80px);font-size:13px;font-family:-apple-system,sans-serif';
    emptyDiv.textContent = msg;
    document.body.appendChild(emptyDiv);
  }
}

function updateGroupCounts() {
  document.querySelectorAll('.fv-group-sel').forEach(function(sel) {
    var group = sel.getAttribute('data-group');
    var count = document.querySelectorAll('.fv-tab[data-group="' + group + '"][data-tab]').length;
    var badge = sel.querySelector('.fv-group-count');
    if (badge) badge.textContent = count;
  });
}

function showGroupLoading(groupName, label) {
  // Remove existing tabs for this group
  document.querySelectorAll('.fv-tab[data-group="' + groupName + '"]').forEach(function(tab) { tab.remove(); });
  document.querySelectorAll('.fv-tab-content').forEach(function(panel) {
    if (panel.id && panel.id.indexOf('fv-tab-' + groupName + '-') === 0) panel.remove();
  });
  // Create a loading content panel tied to this group
  var panelId = 'fv-loading-' + groupName.replace(/\./g, '-');
  var existing = document.getElementById(panelId);
  if (!existing) {
    var panel = document.createElement('div');
    panel.className = 'fv-tab-content';
    panel.id = panelId;
    panel.setAttribute('data-loading-group', groupName);
    panel.innerHTML = '<div class="fv-tab-loading-content">Loading ' + escapeHtml(label) + '</div>';
    document.body.appendChild(panel);
  }
  fv.loadingGroups[groupName] = panelId;
  updateGroupCounts();
  // If this group is active, show the loading panel
  var activeSel = document.querySelector('.fv-group-sel.active');
  if (activeSel && activeSel.getAttribute('data-group') === groupName) {
    document.querySelectorAll('.fv-tab-content.active').forEach(function(content) { content.classList.remove('active'); });
    var loadPanel = document.getElementById(panelId);
    if (loadPanel) loadPanel.classList.add('active');
  }
}

function showGitLoading(modeLabel) {
  document.querySelectorAll('.fv-group-sel[data-group^="git."]').forEach(function(sel) {
    var group = sel.getAttribute('data-group');
    showGroupLoading(group, modeLabel);
  });
}

function removeWatchedRepository(btn) {
  var repoName = btn.getAttribute('data-unwatch');
  if (!repoName) return;
  var groupName = 'git.' + repoName;
  var sel = btn.closest('.fv-group-sel');
  var prevGroup = sel ? sel.previousElementSibling : null;
  while (prevGroup && !prevGroup.classList.contains('fv-group-sel')) {
    prevGroup = prevGroup.previousElementSibling;
  }
  var targetGroup = prevGroup ? prevGroup.getAttribute('data-group') : 'files';
  if (sel) sel.remove();
  document.querySelectorAll('.fv-tab[data-group="' + groupName + '"]').forEach(function(tab) { tab.remove(); });
  document.querySelectorAll('.fv-tab-content').forEach(function(panel) {
    if (panel.id && panel.id.indexOf('fv-tab-' + groupName + '-') === 0) panel.remove();
  });
  var loadingPanel = document.getElementById('fv-loading-' + groupName.replace(/\./g, '-'));
  if (loadingPanel) loadingPanel.remove();
  delete fv.loadingGroups[groupName];
  switchTabGroup(targetGroup);
  var first = document.querySelector('.fv-tab.fv-group-visible[data-tab]');
  if (first) activateTab(first.getAttribute('data-tab'));
  fetch('/_unwatch?name=' + encodeURIComponent(repoName));
  showToast('Stopped watching ' + repoName + ' \u2713');
}

function createGroupHeader(groupName, label) {
  var groupBar = document.querySelector('.fv-group-bar');
  if (!groupBar) return;
  if (groupBar.querySelector('[data-group="' + groupName + '"]')) return;
  var addGitBtnEl = document.getElementById('fv-add-git');
  var insertBefore = addGitBtnEl || groupBar.querySelector('.fv-tab-spacer');
  var sel = document.createElement('span');
  sel.className = 'fv-group-sel';
  sel.setAttribute('data-group', groupName);
  sel.innerHTML = '&#9095; ' + escapeHtml(label) + ' <span class="fv-group-count">0</span><span class="fv-group-close" data-unwatch="' + escapeHtml(label) + '" title="Stop watching">&times;</span>';
  groupBar.insertBefore(sel, insertBefore);
  sel.addEventListener('click', function(e) {
    if (e.target.classList.contains('fv-group-close')) return;
    var tabs = document.querySelectorAll('.fv-tab[data-group="' + groupName + '"]');
    if (tabs.length === 0) {
      switchTabGroup(groupName);
      showGroupLoading(groupName, label + ' changes');
      fv.lastOpenTriggered = 0;
      fetch('/_refresh');
      return;
    }
    switchTabGroup(groupName);
    var first = document.querySelector('.fv-tab.fv-group-visible[data-tab]');
    if (first) { activateTab(first.getAttribute('data-tab')); }
  });
}

// --- Viewed files feature (git diff review) ---

function getViewedToggleHtml() {
  return '<span class="fv-viewed-toggle" title="Mark as viewed">' +
    '<svg class="fv-eye-open" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2c-2.8 0-5.2 1.7-6.8 4.3a1.5 1.5 0 0 0 0 1.4C2.8 10.3 5.2 12 8 12s5.2-1.7 6.8-4.3a1.5 1.5 0 0 0 0-1.4C13.2 3.7 10.8 2 8 2zm0 8.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/><circle cx="8" cy="7" r="2"/></svg>' +
    '<svg class="fv-eye-closed" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 1.5l13 13m-1.5-3.6A7.5 7.5 0 0 0 14.8 7.7a1.5 1.5 0 0 0 0-1.4C13.2 3.7 10.8 2 8 2c-1.1 0-2.2.3-3.1.7m-2.5 2A8.4 8.4 0 0 0 1.2 6.3a1.5 1.5 0 0 0 0 1.4C2.8 10.3 5.2 12 8 12c1.1 0 2.2-.3 3.1-.7"/><path d="M6 7a2 2 0 0 0 2.7 1.9M9.5 5.2A2 2 0 0 0 6.2 6.5"/></svg>' +
    '</span>';
}

function computeFileContentHash(tabId) {
  var panel = document.getElementById(tabId);
  if (!panel) return '';
  var codeLines = panel.querySelectorAll('.code-line');
  if (codeLines.length === 0) return '';
  // Use diff line count + first/last line content as a lightweight hash
  var diffLines = panel.querySelectorAll('.code-line.diff-added, .code-line.diff-removed');
  var first = diffLines.length > 0 ? (diffLines[0].textContent || '').substring(0, 40) : '';
  var last = diffLines.length > 1 ? (diffLines[diffLines.length - 1].textContent || '').substring(0, 40) : '';
  return diffLines.length + ':' + first + ':' + last;
}

function setFileViewed(filePath, viewed) {
  if (viewed) {
    fv.viewedFiles[filePath] = true;
    // Snapshot content hash so we can detect changes
    var tab = document.querySelector('.fv-tab[title="' + escapeCssSelector(filePath) + '"]');
    if (tab) {
      var tabId = tab.getAttribute('data-tab');
      fv.viewedFileHashes[filePath] = computeFileContentHash(tabId);
    }
  } else {
    delete fv.viewedFiles[filePath];
    delete fv.viewedFileHashes[filePath];
  }
  applyViewedState(filePath);
  updateAllViewedCounters();
}

function applyViewedState(filePath) {
  var isViewed = !!fv.viewedFiles[filePath];
  var tabs = document.querySelectorAll('.fv-tab[title="' + escapeCssSelector(filePath) + '"]');
  tabs.forEach(function(tab) {
    tab.classList.toggle('fv-file-viewed', isViewed);
    var toggle = tab.querySelector('.fv-viewed-toggle');
    if (toggle) {
      toggle.classList.toggle('viewed', isViewed);
      toggle.title = isViewed ? 'Mark as unviewed' : 'Mark as viewed';
    }
  });
}

function applyAllViewedStates() {
  Object.keys(fv.viewedFiles).forEach(function(fp) {
    applyViewedState(fp);
  });
}

function toggleActiveTabViewed() {
  var tab = document.querySelector('.fv-tab.active');
  if (!tab) return;
  var group = tab.getAttribute('data-group') || '';
  if (group.indexOf('git.') !== 0) return;
  var fp = tab.getAttribute('title');
  if (!fp) return;
  setFileViewed(fp, !fv.viewedFiles[fp]);
}

function markAllViewed(groupName) {
  var tabs = document.querySelectorAll('.fv-tab[data-group="' + groupName + '"][data-tab]');
  tabs.forEach(function(tab) {
    var fp = tab.getAttribute('title');
    if (fp) setFileViewed(fp, true);
  });
}

function resetAllViewed(groupName) {
  var tabs = document.querySelectorAll('.fv-tab[data-group="' + groupName + '"][data-tab]');
  tabs.forEach(function(tab) {
    var fp = tab.getAttribute('title');
    if (fp) setFileViewed(fp, false);
  });
}

function getViewedCount(groupName) {
  var tabs = document.querySelectorAll('.fv-tab[data-group="' + groupName + '"][data-tab]');
  var total = tabs.length;
  var viewed = 0;
  tabs.forEach(function(tab) {
    var fp = tab.getAttribute('title');
    if (fp && fv.viewedFiles[fp]) viewed++;
  });
  return { viewed: viewed, total: total };
}

function updateViewedCounter(groupName) {
  var sel = document.querySelector('.fv-group-sel[data-group="' + groupName + '"]');
  if (!sel) return;
  var counts = getViewedCount(groupName);
  if (counts.total === 0) {
    // Remove counter if group has no tabs
    var existing = sel.querySelector('.fv-viewed-counter');
    if (existing) existing.remove();
    return;
  }
  var counter = sel.querySelector('.fv-viewed-counter');
  if (!counter) {
    counter = document.createElement('span');
    counter.className = 'fv-viewed-counter';
    // Insert before the close button
    var closeBtn = sel.querySelector('.fv-group-close');
    if (closeBtn) {
      sel.insertBefore(counter, closeBtn);
    } else {
      sel.appendChild(counter);
    }
  }
  var fractionHtml = counts.viewed > 0
    ? '<span class="fv-viewed-fraction">' + counts.viewed + '/' + counts.total + '</span>'
    : '';
  var actionsHtml = '<span class="fv-viewed-actions">' +
    '<span class="fv-viewed-action" data-viewed-action="all" data-viewed-group="' + escapeHtml(groupName) + '" title="Mark all as viewed">&#10003;</span>' +
    '<span class="fv-viewed-action" data-viewed-action="reset" data-viewed-group="' + escapeHtml(groupName) + '" title="Reset all">&#8635;</span>' +
    '</span>';
  counter.innerHTML = fractionHtml + actionsHtml;
}

function updateAllViewedCounters() {
  document.querySelectorAll('.fv-group-sel[data-group^="git."]').forEach(function(sel) {
    var groupName = sel.getAttribute('data-group');
    updateViewedCounter(groupName);
  });
}

function cleanupViewedState() {
  // Remove viewed state for files no longer in any git tab
  var gitFilePaths = {};
  document.querySelectorAll('.fv-tab[data-group^="git."][data-tab]').forEach(function(tab) {
    var fp = tab.getAttribute('title');
    if (fp) gitFilePaths[fp] = true;
  });
  Object.keys(fv.viewedFiles).forEach(function(fp) {
    if (!gitFilePaths[fp]) {
      delete fv.viewedFiles[fp];
      delete fv.viewedFileHashes[fp];
    }
  });
}

function checkViewedFileChanges() {
  // If a file was marked viewed but its content changed, reset to unviewed
  Object.keys(fv.viewedFiles).forEach(function(fp) {
    var tab = document.querySelector('.fv-tab[title="' + escapeCssSelector(fp) + '"]');
    if (!tab) return;
    var tabId = tab.getAttribute('data-tab');
    var currentHash = computeFileContentHash(tabId);
    var savedHash = fv.viewedFileHashes[fp];
    if (savedHash && currentHash && savedHash !== currentHash) {
      delete fv.viewedFiles[fp];
      delete fv.viewedFileHashes[fp];
      applyViewedState(fp);
    }
  });
}

function injectViewedToggles(root) {
  var container = root || document;
  container.querySelectorAll('.fv-tab[data-group^="git."][data-tab]').forEach(function(tab) {
    // Don't add duplicate toggles
    if (tab.querySelector('.fv-viewed-toggle')) return;
    var toggleHtml = getViewedToggleHtml();
    var toggleWrapper = document.createElement('span');
    toggleWrapper.innerHTML = toggleHtml;
    var toggle = toggleWrapper.firstChild;
    tab.appendChild(toggle);
    toggle.addEventListener('click', function(e) {
      e.stopPropagation();
      var fp = tab.getAttribute('title');
      if (!fp) return;
      setFileViewed(fp, !fv.viewedFiles[fp]);
    });
  });
}

function pollGroupCount(groupName, repoName) {
  var attempts = 0;
  var pollInterval = setInterval(function() {
    attempts++;
    if (attempts > POLL_GROUP_COUNT_MAX_ATTEMPTS) { clearInterval(pollInterval); return; }
    fetch('/_git-settings')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.repo_counts && data.repo_counts[repoName] > 0) {
          var badge = document.querySelector('.fv-group-sel[data-group="' + groupName + '"] .fv-group-count');
          if (badge) badge.textContent = data.repo_counts[repoName];
          clearInterval(pollInterval);
        }
      })
      .catch(function() { /* non-critical */ });
  }, POLL_GROUP_COUNT_INTERVAL);
}
