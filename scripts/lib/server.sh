#!/bin/bash
# server.sh — Local HTTP server for live auto-reload

stop_server() {
  if [ -f "$SERVER_PID_FILE" ]; then
    local pid
    pid=$(cat "$SERVER_PID_FILE")
    kill "$pid" 2>/dev/null || true
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
import http.server, socketserver, urllib.parse, os, sys, subprocess, json, threading, signal

DIR = sys.argv[1]
TABS = os.path.join(DIR, 'tabs')
SEARCH_ROOT = os.path.join(DIR, 'search_root')
SCRIPT = os.environ.get('FILEVIEW_SCRIPT', '')

SEARCH_TIMEOUT = 5
SEARCH_EXCLUDES = ['.git', 'node_modules', '.cache', '__pycache__', '.DS_Store',
                   'Library', '.Trash', '.npm', '.yarn', '.pnpm-store', 'vendor/bundle',
                   '.vscode', '.cursor', '.docker', '.local/share', '.oh-my-zsh']

def get_search_root():
    if os.path.exists(SEARCH_ROOT):
        root = open(SEARCH_ROOT).read().strip()
        if root and os.path.isdir(root):
            return root
    # Default: git root of the active file, fallback to ~
    active_file = os.path.join(DIR, 'active')
    if os.path.exists(active_file):
        active_path = open(active_file).read().strip()
        if active_path:
            d = os.path.dirname(active_path)
            try:
                result = subprocess.run(
                    ['git', 'rev-parse', '--show-toplevel'],
                    cwd=d, capture_output=True, text=True, timeout=2)
                if result.returncode == 0:
                    return result.stdout.strip()
            except Exception:
                pass
    return os.path.expanduser('~')

def clamp_limit(qs):
    try:
        v = int(qs.get('limit', ['50'])[0])
        return max(1, min(v, 200))
    except ValueError:
        return 50

def run_search(cmd, cwd, limit):
    results = []
    proc = subprocess.Popen(cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
    try:
        for line in proc.stdout:
            results.append(line.rstrip('\n')[:2000])
            if len(results) >= limit:
                break
    except Exception:
        pass
    proc.kill()
    try: proc.wait(timeout=1)
    except: pass
    return results

def run_piped_search(file_cmd, query, cwd, limit):
    file_proc = subprocess.Popen(file_cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    fzf_proc = subprocess.Popen(
        ['fzf', '--filter=' + query, '--no-sort'],
        stdin=file_proc.stdout, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
    file_proc.stdout.close()
    results = []
    try:
        for line in fzf_proc.stdout:
            results.append(line.rstrip('\n')[:2000])
            if len(results) >= limit:
                break
    except Exception:
        pass
    fzf_proc.kill()
    file_proc.kill()
    try: fzf_proc.wait(timeout=1)
    except: pass
    try: file_proc.wait(timeout=1)
    except: pass
    return results

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
        if parsed.path == '/_open-workspace':
            qs = urllib.parse.parse_qs(parsed.query)
            fp = qs.get('path', [''])[0]
            if fp:
                d = os.path.dirname(fp)
                try:
                    result = subprocess.run(['git', 'rev-parse', '--show-toplevel'],
                        cwd=d, capture_output=True, text=True, timeout=2)
                    if result.returncode == 0:
                        d = result.stdout.strip()
                except Exception:
                    pass
                subprocess.Popen(['open', '-a', 'Cursor', d], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
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
        if parsed.path == '/_gen':
            import re
            gen_val = tabs_val = ''
            try:
                with open(os.path.join(DIR, 'index.html')) as f:
                    head = f.read(20000)
                m = re.search(r'data-fv-gen=\"(\d+)\"', head)
                if m: gen_val = m.group(1)
                m2 = re.search(r'data-fv-tabs=\"(\d+)\"', head)
                if m2: tabs_val = m2.group(1)
            except Exception:
                pass
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(('{\"gen\":\"' + gen_val + '\",\"tabs\":\"' + tabs_val + '\"}').encode())
            return
        if parsed.path == '/_search-root':
            qs = urllib.parse.parse_qs(parsed.query)
            new_root = qs.get('path', [''])[0]
            if new_root:
                new_root = os.path.expanduser(new_root)
                if os.path.isdir(new_root):
                    with open(SEARCH_ROOT, 'w') as f:
                        f.write(new_root)
            root = get_search_root()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'root': root}).encode())
            return
        if parsed.path == '/_search-text':
            qs = urllib.parse.parse_qs(parsed.query)
            query = qs.get('q', [''])[0]
            limit = clamp_limit(qs)
            cwd = get_search_root()
            results = []
            if query and len(query) >= 2:
                try:
                    cmd = ['rg', '--line-number', '--no-heading', '--color=never',
                           '--smart-case', '--max-count=3']
                    for exc in SEARCH_EXCLUDES:
                        cmd += ['-g', '!' + exc]
                    cmd += ['--', query]
                    lines = run_search(cmd, cwd, limit)
                    for raw in lines:
                        parts = raw.split(':', 2)
                        if len(parts) >= 3:
                            filepath = os.path.normpath(os.path.join(cwd, parts[0]))
                            results.append({'file': filepath, 'fname': os.path.basename(parts[0]),
                                            'line': parts[1], 'content': parts[2]})
                except FileNotFoundError:
                    pass
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(results).encode())
            return
        if parsed.path == '/_search-files':
            qs = urllib.parse.parse_qs(parsed.query)
            query = qs.get('q', [''])[0]
            limit = clamp_limit(qs)
            cwd = get_search_root()
            results = []
            if query:
                file_cmd = ['rg', '--files', '--hidden']
                for exc in SEARCH_EXCLUDES:
                    file_cmd += ['-g', '!' + exc]
                lines = run_piped_search(file_cmd, query, cwd, limit)
            else:
                # No query: list files from search root
                file_cmd = ['rg', '--files', '--hidden']
                for exc in SEARCH_EXCLUDES:
                    file_cmd += ['-g', '!' + exc]
                lines = run_search(file_cmd, cwd, limit)
            for raw in lines:
                path = raw.strip()
                if not path: continue
                abs_path = os.path.normpath(os.path.join(cwd, path))
                results.append({'file': abs_path, 'fname': os.path.basename(abs_path), 'fpath': abs_path})
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(results).encode())
            return
        if parsed.path == '/_open':
            qs = urllib.parse.parse_qs(parsed.query)
            fp = qs.get('path', [''])[0]
            if fp and os.path.isfile(fp):
                # Signal loading state
                open(os.path.join(DIR, 'loading'), 'w').close()
                # Add to tabs
                tabs_lines = []
                if os.path.exists(TABS):
                    with open(TABS) as f:
                        tabs_lines = [l for l in f.read().splitlines() if l]
                if fp not in tabs_lines:
                    tabs_lines.append(fp)
                    with open(TABS, 'w') as f:
                        f.write('\n'.join(tabs_lines) + '\n')
                # Set as active
                with open(os.path.join(DIR, 'active'), 'w') as f:
                    f.write(fp)
                # Regenerate HTML
                if SCRIPT:
                    subprocess.Popen([SCRIPT, '_regen'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            self.send_response(204)
            self.end_headers()
            return
        super().do_GET()

class ThreadedServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
ThreadedServer(('127.0.0.1', int(sys.argv[2])), Handler).serve_forever()
" "$_FV_SESSION_DIR" "$port" &>/dev/null &
  echo $! > "$SERVER_PID_FILE"
  # Brief pause for server to bind
  sleep 0.1
}
