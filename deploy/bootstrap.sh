#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/opt/campus
TARGET_USER=${SUDO_USER:-$(whoami)}

sudo mkdir -p "$APP_DIR"/{releases,source,pb_data,pb_public,pb_hooks,bin}
sudo chown -R "$TARGET_USER":"$TARGET_USER" "$APP_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required but not found. Install Node 24+ before continuing." >&2
  exit 1
fi

if [ ! -x "$APP_DIR/bin/pocketbase" ]; then
  echo "PocketBase binary is missing at $APP_DIR/bin/pocketbase. Place the binary there and rerun." >&2
  exit 1
fi

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_DIR=$(cd "$SCRIPT_DIR/.." && pwd)

sudo cp "$REPO_DIR/deploy/campus-app.service" /etc/systemd/system/
sudo cp "$REPO_DIR/deploy/pocketbase.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable pocketbase.service campus-app.service

if [ -f "$REPO_DIR/deploy/Caddyfile" ]; then
  sudo cp "$REPO_DIR/deploy/Caddyfile" /etc/caddy/Caddyfile
  sudo systemctl reload caddy || sudo systemctl restart caddy
fi

echo "Bootstrap finished. Use the CI workflow to upload a release bundle, then run sudo systemctl start pocketbase.service campus-app.service if not already running."
