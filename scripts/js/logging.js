// logging.js — Client-side structured logging: buffer, batch, and send to /_log
var LOG_FLUSH_INTERVAL_MS = 3000;
var LOG_BUFFER_MAX = 100;
var LOG_ENDPOINT = '/_log';

var _logBuffer = [];
var _logFlushTimer = null;

function fvLog(op, data) {
  _logBuffer.push({ ts: new Date().toISOString(), lvl: 'info', op: op, data: data || {} });
  if (_logBuffer.length >= LOG_BUFFER_MAX) _flushLogBuffer();
}

function fvLogError(op, data) {
  _logBuffer.push({ ts: new Date().toISOString(), lvl: 'error', op: op, data: data || {} });
  if (_logBuffer.length >= LOG_BUFFER_MAX) _flushLogBuffer();
}

function _flushLogBuffer() {
  if (_logBuffer.length === 0) return;
  var batch = _logBuffer.splice(0);
  try {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', LOG_ENDPOINT, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(batch));
  } catch (_e) { /* logging failure is non-critical */ }
}

function _startLogFlusher() {
  if (_logFlushTimer) return;
  _logFlushTimer = setInterval(_flushLogBuffer, LOG_FLUSH_INTERVAL_MS);
}

function _stopLogFlusher() {
  if (_logFlushTimer) { clearInterval(_logFlushTimer); _logFlushTimer = null; }
  _flushLogBuffer();
}
