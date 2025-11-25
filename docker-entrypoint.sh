#!/bin/sh
set -e

# Railway provides PORT env var - Caddy will listen on it
RAILWAY_PORT="${PORT:-8080}"

echo "Starting PocketBase on port 8090..."
/usr/local/bin/pocketbase serve \
    --http="0.0.0.0:8090" \
    --dir=/pb_data \
    --hooksDir=/app/pb_hooks \
    --migrationsDir=/app/pb_migrations &

echo "Starting SvelteKit on port 3000..."
# Use internal localhost URL for server-side communication with PocketBase
# The browser will use same-origin since Caddy proxies /api/* to PocketBase
PORT=3000 INTERNAL_POCKETBASE_URL="http://127.0.0.1:8090" node /app/build/index.js &

echo "Starting Caddy on port ${RAILWAY_PORT}..."
PORT="${RAILWAY_PORT}" exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
