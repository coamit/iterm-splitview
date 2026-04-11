#!/bin/bash
# server.sh — Local HTTP server for live auto-reload

stop_server() {
  if [ -f "$SERVER_PID_FILE" ]; then
    local pid
    pid=$(cat "$SERVER_PID_FILE")
    kill "$pid" 2>/dev/null
    rm -f "$SERVER_PID_FILE" "$SERVER_PORT_FILE"
  fi
}

start_server() {
  # Reuse existing server if it's still running
  if [ -f "$SERVER_PID_FILE" ] && [ -f "$SERVER_PORT_FILE" ]; then
    local pid
    pid=$(cat "$SERVER_PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
  fi
  stop_server
  local port
  port=$(python3 -c "import socket; s=socket.socket(); s.bind(('',0)); print(s.getsockname()[1]); s.close()")
  echo "$port" > "$SERVER_PORT_FILE"
  FILEVIEW_SCRIPT="$(realpath "${_FV_ENTRYPOINT:-$0}")" python3 -c "
import http.server, urllib.parse, os, sys, subprocess

DIR = sys.argv[1]
TABS = os.path.join(DIR, 'tabs')
SCRIPT = os.environ.get('FILEVIEW_SCRIPT', '')

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=DIR, **kw)
    def log_message(self, *a):
        pass
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/_close':
            qs = urllib.parse.parse_qs(parsed.query)
            fp = qs.get('path', [''])[0]
            new_active = qs.get('active', [''])[0]
            if fp and os.path.exists(TABS):
                with open(TABS) as f:
                    lines = [l for l in f.read().splitlines() if l and l != fp]
                with open(TABS, 'w') as f:
                    f.write('\n'.join(lines) + '\n' if lines else '')
                active_file = os.path.join(DIR, 'active')
                if new_active:
                    with open(active_file, 'w') as f:
                        f.write(new_active)
                elif lines:
                    with open(active_file, 'w') as f:
                        f.write(lines[0])
                if SCRIPT:
                    subprocess.Popen([SCRIPT, '_regen'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            self.send_response(204)
            self.end_headers()
            return
        if parsed.path == '/_open-in-editor':
            qs = urllib.parse.parse_qs(parsed.query)
            fp = qs.get('path', [''])[0]
            if fp:
                subprocess.Popen(['open', '-a', 'Cursor', fp], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            self.send_response(204)
            self.end_headers()
            return
        if parsed.path == '/_loading':
            loading = os.path.exists(os.path.join(DIR, 'loading'))
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{\"loading\":true}' if loading else b'{\"loading\":false}')
            return
        super().do_GET()

http.server.HTTPServer(('', int(sys.argv[2])), Handler).serve_forever()
" "$_FV_SESSION_DIR" "$port" &>/dev/null &
  echo $! > "$SERVER_PID_FILE"
  # Brief pause for server to bind
  sleep 0.1
}
