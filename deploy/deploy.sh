#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/opt/campus
RELEASES=$APP_DIR/releases
TS=$(date +%Y%m%d%H%M%S)
RELEASE=$RELEASES/$TS

mkdir -p "$RELEASES"
rsync -a --delete --exclude=node_modules --exclude=.git ./ "$RELEASE/"

cd "$RELEASE"
if command -v npm >/dev/null 2>&1; then
  npm ci --prefer-offline --no-audit --progress=false
  npm run build
else
  echo "npm not found" >&2; exit 1
fi

ln -sfn "$RELEASE" "$APP_DIR/current"

sudo systemctl daemon-reload || true
sudo systemctl restart pocketbase.service || true
sudo systemctl restart campus-app.service

echo "Deployed release $TS"
