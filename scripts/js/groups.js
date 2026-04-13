// groups.js — Group switching, counts, loading states, unwatch, group headers, polling
var fv = window.fv;

function switchGroup(groupName) {
  // Save current group's active tab before switching
  var curGroupSel = document.querySelector('.fv-group-sel.active');
  if (curGroupSel) {
    var curGroup = curGroupSel.getAttribute('data-group');
    var curActive = document.querySelector('.fv-tab.active[data-group="' + curGroup + '"]');
    if (curActive) fv.groupLastTab[curGroup] = curActive.getAttribute('title');
  }
  document.querySelectorAll('.fv-group-sel').forEach(function(s) {
    s.classList.toggle('active', s.getAttribute('data-group') === groupName);
  });
  // Show only tabs from active group
  document.querySelectorAll('.fv-tab-bar .fv-tab[data-group]').forEach(function(t) {
    t.classList.toggle('fv-group-visible', t.getAttribute('data-group') === groupName);
  });
  // Show + button only for files group
  var addBtn = document.getElementById('fv-add-file');
  if (addBtn) addBtn.style.display = (groupName === 'files') ? '' : 'none';
  // Hide all loading panels, show the one for this group if loading
  document.querySelectorAll('[data-loading-group]').forEach(function(p) { p.classList.remove('active'); });
  var existingEmpty = document.getElementById('fv-group-empty');
  if (existingEmpty) existingEmpty.remove();

  // Check if this group is in loading state
  if (fv.loadingGroups[groupName]) {
    document.querySelectorAll('.fv-tab-content.active').forEach(function(c) { c.classList.remove('active'); });
    var lp = document.getElementById(fv.loadingGroups[groupName]);
    if (lp) lp.classList.add('active');
    return;
  }

  var hasVisibleTabs = document.querySelector('.fv-tab.fv-group-visible[data-tab]');
  if (!hasVisibleTabs) {
    document.querySelectorAll('.fv-tab-content.active').forEach(function(c) { c.classList.remove('active'); });
    var emptyDiv = document.createElement('div');
    emptyDiv.className = 'fv-tab-content active';
    emptyDiv.id = 'fv-group-empty';
    var isGit = groupName.indexOf('git.') === 0;
    var msg = isGit ? 'No changes on this branch' : 'Press Ctrl+O to open a file';
    emptyDiv.style.cssText = 'display:flex;align-items:center;justify-content:center;min-height:calc(100vh - 80px);color:#6a7080;font-size:13px;font-family:-apple-system,sans-serif';
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
  document.querySelectorAll('.fv-tab[data-group="' + groupName + '"]').forEach(function(t) { t.remove(); });
  document.querySelectorAll('.fv-tab-content').forEach(function(p) {
    if (p.id && p.id.indexOf('fv-tab-' + groupName + '-') === 0) p.remove();
  });
  // Create a loading content panel tied to this group
  var panelId = 'fv-loading-' + groupName.replace(/\./g, '-');
  var existing = document.getElementById(panelId);
  if (!existing) {
    var panel = document.createElement('div');
    panel.className = 'fv-tab-content';
    panel.id = panelId;
    panel.setAttribute('data-loading-group', groupName);
    panel.innerHTML = '<div class="fv-tab-loading-content">Loading ' + escHtml(label) + '</div>';
    document.body.appendChild(panel);
  }
  fv.loadingGroups[groupName] = panelId;
  updateGroupCounts();
  // If this group is active, show the loading panel
  var activeSel = document.querySelector('.fv-group-sel.active');
  if (activeSel && activeSel.getAttribute('data-group') === groupName) {
    document.querySelectorAll('.fv-tab-content.active').forEach(function(c) { c.classList.remove('active'); });
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

function handleUnwatch(btn) {
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
  document.querySelectorAll('.fv-tab[data-group="' + groupName + '"]').forEach(function(t) { t.remove(); });
  document.querySelectorAll('.fv-tab-content').forEach(function(p) {
    if (p.id && p.id.indexOf('fv-tab-' + groupName + '-') === 0) p.remove();
  });
  var lp = document.getElementById('fv-loading-' + groupName.replace(/\./g, '-'));
  if (lp) lp.remove();
  delete fv.loadingGroups[groupName];
  switchGroup(targetGroup);
  var first = document.querySelector('.fv-tab.fv-group-visible[data-tab]');
  if (first) activateTab(first.getAttribute('data-tab'));
  fetch('/_unwatch?name=' + encodeURIComponent(repoName));
  showToast('Stopped watching ' + repoName + ' \u2713');
}

function addGroupHeader(groupName, label) {
  var groupBar = document.querySelector('.fv-group-bar');
  if (!groupBar) return;
  if (groupBar.querySelector('[data-group="' + groupName + '"]')) return;
  var addGitBtnEl = document.getElementById('fv-add-git');
  var insertBefore = addGitBtnEl || groupBar.querySelector('.fv-tab-spacer');
  var sel = document.createElement('span');
  sel.className = 'fv-group-sel';
  sel.setAttribute('data-group', groupName);
  sel.innerHTML = '&#9095; ' + escHtml(label) + ' <span class="fv-group-count">0</span><span class="fv-group-close" data-unwatch="' + escHtml(label) + '" title="Stop watching">&times;</span>';
  groupBar.insertBefore(sel, insertBefore);
  sel.addEventListener('click', function(e) {
    if (e.target.classList.contains('fv-group-close')) return;
    var tabs = document.querySelectorAll('.fv-tab[data-group="' + groupName + '"]');
    if (tabs.length === 0) {
      switchGroup(groupName);
      showGroupLoading(groupName, label + ' changes');
      fv.lastOpenTriggered = 0;
      fetch('/_refresh');
      return;
    }
    switchGroup(groupName);
    var first = document.querySelector('.fv-tab.fv-group-visible[data-tab]');
    if (first) { activateTab(first.getAttribute('data-tab')); }
  });
}

function pollGroupCount(groupName, repoName) {
  var attempts = 0;
  var pollInterval = setInterval(function() {
    attempts++;
    if (attempts > POLL_GROUP_COUNT_MAX_ATTEMPTS) { clearInterval(pollInterval); return; }
    fetch('/_git-settings')
      .then(function(r) { return r.json(); })
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
