// theme.js — Theme definitions, applyTheme, CSS generation, settings modal, theme grid
var fv = window.fv;

var themes = {
  midnight: { name: 'Midnight', dark: true, bg: '#1f2430', bgAlt: '#171b24', bgHover: '#2a3040', bgCode: '#282c34', bgHead: '#2a2f3d',
    text: '#ccd0d4', textBright: '#e8ecf0', textMuted: '#6a7080', textDim: '#4b5263', textPlaceholder: '#8a90a0',
    border: '#353b4a', borderAlt: '#252a35', accent: '#73b8f0', accentAlt: '#ffcc66', accentCode: '#ffcc66',
    link: '#73b8f0', tableBg: '#2d3748', tableBorder: '#4a5568', blockquote: '#87d96c',
    diffAdd: 'rgba(40,200,64,0.22)', diffRem: 'rgba(255,95,87,0.22)', diffAddLn: '#28c840', diffRemLn: '#ff5f57',
    hljsTheme: 'atom-one-dark' },
  obsidian: { name: 'Obsidian', dark: true, bg: '#1b1b1f', bgAlt: '#151518', bgHover: '#232327', bgCode: '#1e1e22', bgHead: '#222226',
    text: '#cccccc', textBright: '#e0e0e0', textMuted: '#6e6e7a', textDim: '#4e4e58', textPlaceholder: '#7a7a86',
    border: '#2d2d33', borderAlt: '#232328', accent: '#a78bfa', accentAlt: '#d4a051', accentCode: '#d4a051',
    link: '#a78bfa', tableBg: '#222226', tableBorder: '#2d2d33', blockquote: '#a78bfa',
    diffAdd: 'rgba(74,222,128,0.14)', diffRem: 'rgba(248,113,113,0.14)', diffAddLn: '#3fb950', diffRemLn: '#f47067',
    hljsTheme: 'vs2015',
    hljsOverride: '.hljs{color:#cccccc;background:#1e1e22}.hljs-keyword,.hljs-selector-tag,.hljs-built_in,.hljs-type,.hljs-tag,.hljs-attr,.hljs-name{color:#a78bfa}.hljs-string,.hljs-symbol,.hljs-bullet,.hljs-addition,.hljs-variable,.hljs-template-tag,.hljs-template-variable,.hljs-function,.hljs-title,.hljs-section{color:#cccccc}.hljs-comment,.hljs-quote,.hljs-deletion,.hljs-meta{color:#6e6e7a}.hljs-literal,.hljs-number{color:#b4a4e0}.hljs-attribute{color:#cccccc}' },
  evergreen: { name: 'Evergreen', dark: true, bg: '#1a2320', bgAlt: '#141d1a', bgHover: '#243530', bgCode: '#1c2824', bgHead: '#213029',
    text: '#c8d4cc', textBright: '#e2ece6', textMuted: '#6b8275', textDim: '#4a6358', textPlaceholder: '#7f9a8c',
    border: '#2d4038', borderAlt: '#233029', accent: '#6ee7b7', accentAlt: '#fcd34d', accentCode: '#fcd34d',
    link: '#6ee7b7', tableBg: '#213029', tableBorder: '#2d4038', blockquote: '#6ee7b7',
    diffAdd: 'rgba(52,211,153,0.2)', diffRem: 'rgba(251,146,60,0.2)', diffAddLn: '#34d399', diffRemLn: '#fb923c',
    hljsTheme: 'atom-one-dark' },
  paper: { name: 'Paper', dark: false, bg: '#ffffff', bgAlt: '#eaecef', bgHover: '#f6f8fa', bgCode: '#fafafa', bgHead: '#f6f8fa',
    text: '#24292e', textBright: '#24292e', textMuted: '#6a737d', textDim: '#9ca3af', textPlaceholder: '#6a737d',
    border: '#d0d7de', borderAlt: '#d0d7de', accent: '#0366d6', accentAlt: '#c45100', accentCode: '#c45100',
    link: '#0366d6', tableBg: '#f6f8fa', tableBorder: '#d0d7de', blockquote: '#3fb950',
    diffAdd: 'rgba(40,200,64,0.15)', diffRem: 'rgba(255,95,87,0.15)', diffAddLn: '#1a7f37', diffRemLn: '#d1242f',
    hljsTheme: 'atom-one-light' },
  latte: { name: 'Latte', dark: false, bg: '#faf8f5', bgAlt: '#efe9e0', bgHover: '#f3ede5', bgCode: '#f5f0ea', bgHead: '#f0ebe3',
    text: '#3d3929', textBright: '#2d2517', textMuted: '#8a7e6b', textDim: '#b0a48e', textPlaceholder: '#8a7e6b',
    border: '#ddd4c4', borderAlt: '#ddd4c4', accent: '#b45309', accentAlt: '#92400e', accentCode: '#92400e',
    link: '#b45309', tableBg: '#f0ebe3', tableBorder: '#ddd4c4', blockquote: '#65a30d',
    diffAdd: 'rgba(101,163,13,0.15)', diffRem: 'rgba(220,38,38,0.15)', diffAddLn: '#4d7c0f', diffRemLn: '#dc2626',
    hljsTheme: 'atom-one-light' },
  arctic: { name: 'Arctic', dark: false, bg: '#f0f4f8', bgAlt: '#dce4ed', bgHover: '#e4eaf2', bgCode: '#e8eef5', bgHead: '#e1e8f0',
    text: '#1e3a5f', textBright: '#0f2440', textMuted: '#5a7a9a', textDim: '#8faabe', textPlaceholder: '#5a7a9a',
    border: '#c5d3e0', borderAlt: '#c5d3e0', accent: '#2563eb', accentAlt: '#c2410c', accentCode: '#c2410c',
    link: '#2563eb', tableBg: '#e1e8f0', tableBorder: '#c5d3e0', blockquote: '#059669',
    diffAdd: 'rgba(5,150,105,0.15)', diffRem: 'rgba(225,29,72,0.15)', diffAddLn: '#047857', diffRemLn: '#e11d48',
    hljsTheme: 'atom-one-light' }
};

function buildThemeCSS(theme) {
  return 'body { color: ' + theme.text + '; background: ' + theme.bg + '; }' +
    '.fv-tab-bar { background: ' + theme.bgAlt + '; border-bottom-color: ' + theme.border + '; }' +
    '.fv-tab-bar::-webkit-scrollbar-thumb { background: ' + theme.border + '; }' +
    '.fv-tab { color: ' + theme.textMuted + '; border-right-color: ' + theme.borderAlt + '; }' +
    '.fv-tab:hover { color: ' + theme.text + '; background: ' + theme.bg + '; }' +
    '.fv-tab.active { color: ' + theme.textBright + '; background: ' + theme.bg + '; }' +
    '.fv-tab.active::after { background: ' + theme.accent + '; }' +
    '.fv-tab-close { color: ' + theme.textDim + '; }' +
    'h1, h2, h3 { color: ' + theme.textBright + '; border-bottom-color: ' + theme.border + '; }' +
    'code { background: ' + theme.bgHover + '; color: ' + theme.accentCode + '; }' +
    'pre { background: ' + theme.bgCode + '; border-color: ' + theme.border + '; }' +
    '.code-line:hover { background: ' + (theme.dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)') + '; }' +
    '.code-line.diff-added { background: ' + theme.diffAdd + '; }' +
    '.code-line.diff-added .ln { color: ' + theme.diffAddLn + '; }' +
    '.code-line.diff-removed { background: ' + theme.diffRem + '; }' +
    '.code-line.diff-removed .ln { color: ' + theme.diffRemLn + '; }' +
    '.code-line.diff-focus { box-shadow: inset 3px 0 0 ' + theme.accent + '; }' +
    '.diff-stat-add { color: ' + theme.diffAddLn + '; }' +
    '.diff-stat-rem { color: ' + theme.diffRemLn + '; }' +
    '.diff-counter-badge { background: ' + theme.bg + '; border-color: ' + theme.border + '; color: ' + theme.text + '; }' +
    '.diff-collapsed .code-line.diff-separator .ln, .diff-collapsed .code-line.diff-separator .lc { border-bottom-color: ' + theme.textDim + '; }' +
    '.ln { color: ' + theme.textDim + '; border-right-color: ' + theme.border + '; }' +
    '.code-file-wrapper { border-color: ' + theme.border + '; }' +
    '.code-file-header { background: ' + theme.bgHead + '; border-bottom-color: ' + theme.border + '; color: ' + theme.textMuted + '; }' +
    '.code-file-header .filename { color: ' + theme.text + '; }' +
    '.code-file-header .lang-badge { background: ' + theme.border + '; color: ' + theme.textMuted + '; }' +
    'a { color: ' + theme.link + '; }' +
    'strong { color: ' + theme.textBright + '; }' +
    'blockquote { border-left-color: ' + theme.blockquote + '; color: ' + theme.textMuted + '; }' +
    'hr { border-top-color: ' + theme.border + '; }' +
    'table { border-color: ' + theme.tableBorder + '; }' +
    'th { background: ' + theme.tableBg + '; border-color: ' + theme.tableBorder + '; }' +
    'td { border-color: ' + theme.tableBorder + '; }' +
    'tr:hover { background: ' + theme.bgHover + '; }' +
    '.fv-modal { background: ' + theme.bg + '; border-color: ' + theme.border + '; }' +
    '.fv-modal-input { background: ' + theme.bgAlt + '; border-bottom-color: ' + theme.border + '; color: ' + theme.textBright + '; }' +
    '.fv-modal-input::placeholder { color: ' + theme.textPlaceholder + '; }' +
    '.fv-modal-item { color: ' + theme.text + '; }' +
    '.fv-modal-item:hover, .fv-modal-item.selected { background: ' + theme.bgHover + '; }' +
    '.fv-modal-item.selected { border-left-color: ' + theme.accent + '; }' +
    '.fv-modal-item .fv-modal-fname { color: ' + theme.textBright + '; }' +
    '.fv-modal-item .fv-modal-fpath { color: ' + theme.textDim + '; }' +
    '.fv-modal-item .fv-modal-content { color: ' + theme.text + '; }' +
    '.fv-modal-item .fv-modal-content mark { background: ' + (theme.dark ? '#e2c46c33' : '#fff3b0') + '; color: ' + (theme.dark ? theme.accentAlt : theme.text) + '; }' +
    '.fv-modal-mode { border-bottom-color: ' + theme.border + '; color: ' + theme.textDim + '; }' +
    '.fv-modal-root { color: ' + theme.textMuted + '; }' +
    '.fv-modal-root:hover { color: ' + theme.textBright + '; border-color: ' + theme.border + '; }' +
    '.fv-modal-root-input { background: ' + theme.bgAlt + '; border-color: ' + theme.accent + '; color: ' + theme.textBright + '; }' +
    '.fv-modal-loading { color: ' + theme.textMuted + '; }' +
    '.fv-modal-loading::after { border-color: ' + theme.border + '; border-top-color: ' + theme.accent + '; }' +
    '.fv-tab-loading-content { color: ' + theme.textMuted + '; }' +
    '.fv-tab-loading-content::before { border-color: ' + theme.border + '; border-top-color: ' + theme.text + '; }' +
    '.fv-toast { background: ' + theme.bgHover + '; border-color: ' + theme.border + '; color: ' + theme.textBright + '; }' +
    '.fv-shortcut-key { background: ' + theme.bgHover + '; border-color: ' + theme.border + '; color: ' + theme.text + '; }' +
    '.fv-shortcut-desc { color: ' + theme.textMuted + '; }' +
    '.fv-settings { background: ' + theme.bg + '; border-color: ' + theme.border + '; }' +
    '.fv-settings-sidebar { background: ' + theme.bgAlt + '; border-right-color: ' + theme.border + '; }' +
    '.fv-settings-sidebar-title { color: ' + theme.textDim + '; }' +
    '.fv-settings-nav-item { color: ' + theme.textMuted + '; }' +
    '.fv-settings-nav-item:hover { color: ' + theme.text + '; }' +
    '.fv-settings-nav-item.active { color: ' + theme.textBright + '; border-left-color: ' + theme.accent + '; }' +
    '.fv-settings-topbar { color: ' + theme.textBright + '; border-bottom-color: ' + theme.border + '; }' +
    '.fv-settings-close:hover { color: ' + theme.textBright + '; background: ' + theme.border + '; }' +
    '.fv-settings-section { color: ' + theme.textMuted + '; }' +
    '.fv-shortcut-row { border-bottom-color: ' + theme.borderAlt + '; }' +
    '.fv-theme-card { border-color: ' + theme.border + '; }' +
    '.fv-theme-card:hover { border-color: ' + theme.textMuted + '; }' +
    '.fv-theme-card.active { border-color: ' + theme.accent + '; }' +
    '.fv-theme-label { color: ' + theme.text + '; }' +
    '.fv-modal-overlay { background: rgba(0,0,0,' + (theme.dark ? '0.5' : '0.2') + '); }' +
    '.fv-settings-overlay { background: rgba(0,0,0,' + (theme.dark ? '0.5' : '0.2') + '); }' +
    '.fv-group-bar { background: ' + theme.bgAlt + '; border-bottom-color: ' + theme.borderAlt + '; }' +
    '.fv-group-sel { color: ' + theme.textDim + '; }' +
    '.fv-group-sel:hover { color: ' + theme.textMuted + '; }' +
    '.fv-group-sel.active { color: ' + theme.text + '; }' +
    '.fv-group-sel[data-group="files"].active { color: ' + theme.accentAlt + '; border-bottom-color: ' + theme.accentAlt + '; }' +
    '.fv-group-sel[data-group="git"].active { color: ' + theme.accent + '; border-bottom-color: ' + theme.accent + '; }' +
    '.fv-group-count { background: ' + theme.border + '; }' +
    '.fv-tab[data-group="files"].active::after { background: ' + theme.accentAlt + '; }' +
    '.fv-tab[data-group^="git."].active::after { background: ' + theme.accent + '; }' +
    '.fv-group-sel[data-group^="git."].active { color: ' + theme.accent + '; border-bottom-color: ' + theme.accent + '; }' +
    '.fv-group-close { color: ' + theme.textDim + '; }' +
    '.fv-group-close:hover { color: #ff5f57; }';
}

function applyTheme(id) {
  var theme = themes[id];
  if (!theme) return;
  fv.currentThemeId = id;
  fetch('/_theme?set=' + encodeURIComponent(id));
  // Update hljs theme
  var hljsLink = document.getElementById('hljs-dark-theme');
  if (hljsLink) hljsLink.href = HLJS_CDN_BASE + theme.hljsTheme + '.min.css';
  // Apply hljs color overrides if theme defines them
  var hljsOvr = document.getElementById('fv-hljs-override');
  if (theme.hljsOverride) {
    if (!hljsOvr) { hljsOvr = document.createElement('style'); hljsOvr.id = 'fv-hljs-override'; document.head.appendChild(hljsOvr); }
    hljsOvr.textContent = theme.hljsOverride;
  } else if (hljsOvr) { hljsOvr.textContent = ''; }
  // Generate CSS overrides
  fv.themeStyleEl.textContent = buildThemeCSS(theme);
}

function renderThemeCard(id, current) {
  var theme = themes[id];
  return '<div class="fv-theme-card' + (id === current ? ' active' : '') + '" data-theme="' + id + '">' +
    '<div class="fv-theme-preview" style="background:' + theme.bg + '">' +
      '<div class="fv-theme-preview-bar" style="background:' + theme.bgAlt + '">' +
        '<div class="fv-theme-preview-tab" style="background:' + theme.textDim + ';opacity:0.5"></div>' +
        '<div class="fv-theme-preview-tab" style="background:' + theme.accent + '"></div>' +
        '<div class="fv-theme-preview-tab" style="background:' + theme.textDim + ';opacity:0.3"></div>' +
      '</div>' +
      '<div class="fv-theme-preview-line" style="background:' + theme.text + ';width:70%;opacity:0.6;margin-top:4px"></div>' +
      '<div class="fv-theme-preview-line" style="background:' + theme.diffAddLn + ';width:55%;opacity:0.5"></div>' +
      '<div class="fv-theme-preview-line" style="background:' + theme.text + ';width:80%;opacity:0.4"></div>' +
      '<div class="fv-theme-preview-line" style="background:' + theme.diffRemLn + ';width:40%;opacity:0.5"></div>' +
    '</div>' +
    '<div class="fv-theme-label" style="background:' + theme.bgAlt + ';color:' + theme.text + '">' + theme.name + '</div>' +
  '</div>';
}

function renderThemeGrid() {
  var current = fv.currentThemeId || 'midnight';
  var darkThemes = [], lightThemes = [];
  Object.keys(themes).forEach(function(id) {
    var theme = themes[id];
    (theme.dark ? darkThemes : lightThemes).push(id);
  });
  fv.themeGrid.innerHTML =
    '<div style="grid-column:1/-1;font-size:10px;color:#6a7080;text-transform:uppercase;letter-spacing:0.5px;padding:4px 0;font-family:-apple-system,sans-serif">Dark</div>' +
    darkThemes.map(function(id) { return renderThemeCard(id, current); }).join('') +
    '<div style="grid-column:1/-1;font-size:10px;color:#6a7080;text-transform:uppercase;letter-spacing:0.5px;padding:8px 0 4px;font-family:-apple-system,sans-serif">Light</div>' +
    lightThemes.map(function(id) { return renderThemeCard(id, current); }).join('');
}

function renderShortcutsPane() {
  var pane = document.getElementById('fv-settings-pane-shortcuts');
  if (!pane || pane.innerHTML.trim()) return;
  pane.innerHTML = shortcutsList.map(function(s) {
    return '<div class="fv-shortcut-row">' +
      '<span class="fv-shortcut-key">' + s.key + '</span>' +
      '<span class="fv-shortcut-desc">' + s.desc + '</span>' +
    '</div>';
  }).join('');
}

var sectionNames = { appearance: 'Appearance', git: 'Git', shortcuts: 'Shortcuts' };

function switchSettingsSection(section) {
  fv.currentSettingsSection = section;
  if (fv.settingsSectionTitle) fv.settingsSectionTitle.textContent = sectionNames[section] || section;
  document.querySelectorAll('.fv-settings-nav-item').forEach(function(el) {
    el.classList.toggle('active', el.getAttribute('data-section') === section);
  });
  document.querySelectorAll('.fv-settings-pane').forEach(function(el) {
    el.classList.toggle('active', el.id === 'fv-settings-pane-' + section);
  });
  if (section === 'shortcuts') renderShortcutsPane();
}

function updateGitModeUI(mode) {
  if (fv.gitModeBranch) fv.gitModeBranch.classList.toggle('active', mode === 'branch');
  if (fv.gitModeLocal) fv.gitModeLocal.classList.toggle('active', mode === 'local');
}

function openSettings(section) {
  var s = section || 'appearance';
  renderThemeGrid();
  fetch('/_git-settings')
    .then(function(r) { return r.json(); })
    .then(function(data) { updateGitModeUI(data.diff_mode || 'branch'); })
    .catch(function() {});
  switchSettingsSection(s);
  fv.settingsOverlay.classList.add('visible');
}

function closeSettings() {
  fv.settingsOverlay.classList.remove('visible');
}

function openGitWatch() {
  if (!fv.gitWatchOverlay) return;
  if (fv.gitWatchInput) fv.gitWatchInput.value = '';
  if (fv.gitWatchStatus) fv.gitWatchStatus.textContent = '';
  fv.gitWatchOverlay.classList.add('visible');
  setTimeout(function() { if (fv.gitWatchInput) fv.gitWatchInput.focus(); }, GIT_WATCH_FOCUS_DELAY_MS);
}

function closeGitWatch() {
  if (fv.gitWatchOverlay) fv.gitWatchOverlay.classList.remove('visible');
}
