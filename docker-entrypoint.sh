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
# PUBLIC_POCKETBASE_URL configures the PocketBase URL for both client and server.
# In Docker, this is set to same-origin pattern since Caddy proxies /api/* to PocketBase.
# The value is baked into the build at compile time via SvelteKit's $env/static/public.
PORT=3000 node /app/build/index.js &

echo "Starting Caddy on port ${RAILWAY_PORT}..."
PORT="${RAILWAY_PORT}" exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
