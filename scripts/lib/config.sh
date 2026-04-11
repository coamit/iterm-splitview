#!/bin/bash
# config.sh — Session directories, paths, and constants

_FV_SESSION_ID="${ITERM_SESSION_ID%%:*}"
_FV_SESSION_DIR="/tmp/fileview/${_FV_SESSION_ID:-default}"
mkdir -p "$_FV_SESSION_DIR"

VIEW_HTML="$_FV_SESSION_DIR/index.html"
VIEW_TEMPLATE="/tmp/fileview/template.html"
TABS_FILE="$_FV_SESSION_DIR/tabs"
ACTIVE_FILE="$_FV_SESSION_DIR/active"
WATCHER_PID="$_FV_SESSION_DIR/watcher.pid"
SERVER_PID_FILE="$_FV_SESSION_DIR/server.pid"
SERVER_PORT_FILE="$_FV_SESSION_DIR/server_port"
PANE_SESSION_ID_FILE="$_FV_SESSION_DIR/pane_session_id"
mkdir -p /tmp/fileview

_DYNAMIC_PROFILES_DIR="$HOME/Library/Application Support/iTerm2/DynamicProfiles"
_PROFILE_FILE="$_DYNAMIC_PROFILES_DIR/fileview-${_FV_SESSION_ID:-default}.json"
_PROFILE_NAME="FileView-${_FV_SESSION_ID:-default}"
