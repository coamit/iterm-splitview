// helpers.js — Utility functions
var fv = window.fv;

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeCssSelector(s) {
  return s.replace(/"/g, '\\"');
}

function showToast(msg, persistent, withSpinner) {
  clearTimeout(fv._toastTimer);
  if (withSpinner) {
    fv.toastEl.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px"><span style="display:inline-block;width:11px;height:11px;border:2px solid rgba(115,184,240,0.3);border-top-color:#73b8f0;border-radius:50%;animation:fv-spin 0.7s linear infinite;flex-shrink:0"></span>' + msg + '</span>';
  } else {
    fv.toastEl.textContent = msg;
  }
  fv.toastEl.classList.add('visible');
  if (!persistent) {
    fv._toastTimer = setTimeout(function() { fv.toastEl.classList.remove('visible'); }, TOAST_DURATION_MS);
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(function() {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
}

function createElement(tag, className, attrs) {
  var el = document.createElement(tag);
  if (className) el.className = className;
  if (attrs) {
    Object.keys(attrs).forEach(function(key) { el.setAttribute(key, attrs[key]); });
  }
  return el;
}
