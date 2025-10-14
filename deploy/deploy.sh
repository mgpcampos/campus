#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/opt/campus
RELEASES=$APP_DIR/releases
BUNDLE=$APP_DIR/source/campus-release.tar.gz

if [ ! -f "$BUNDLE" ]; then
  echo "Release bundle not found at $BUNDLE" >&2
  exit 1
fi

TS=$(date +%Y%m%d%H%M%S)
RELEASE=$RELEASES/$TS

mkdir -p "$RELEASES"
mkdir -p "$RELEASE"
tar -xzf "$BUNDLE" -C "$RELEASE"
rm -f "$BUNDLE"

ln -sfn "$RELEASE" "$APP_DIR/current"

sudo systemctl daemon-reload || true
sudo systemctl restart pocketbase.service || true
sudo systemctl restart campus-app.service

# keep only the five most recent releases to avoid unbounded disk usage
cd "$RELEASES"
ls -1tr | head -n -5 | xargs -r rm -rf

echo "Deployed release $TS"
