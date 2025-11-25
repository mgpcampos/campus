# ==============================================================================
# Multi-stage Dockerfile for Campus (SvelteKit + PocketBase)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Download PocketBase binary
# ------------------------------------------------------------------------------
FROM alpine:3 AS pocketbase

ARG TARGETARCH=amd64
ARG POCKETBASE_VERSION=0.34.0

RUN apk add --no-cache ca-certificates unzip wget \
    && wget -q https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/pocketbase_${POCKETBASE_VERSION}_linux_${TARGETARCH}.zip \
    && unzip pocketbase_${POCKETBASE_VERSION}_linux_${TARGETARCH}.zip -d /tmp \
    && chmod +x /tmp/pocketbase

# ------------------------------------------------------------------------------
# Stage 2: Build SvelteKit application
# ------------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
# Build the application - PocketBase URL is determined at runtime:
# - Browser: uses same-origin (Caddy proxies /api/* to PocketBase)
# - Server: uses INTERNAL_POCKETBASE_URL env var
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 3: Production runtime
# ------------------------------------------------------------------------------
FROM node:22-alpine

WORKDIR /app

# Install Caddy and tini for process management
RUN apk add --no-cache ca-certificates tini caddy

# Copy PocketBase binary
COPY --from=pocketbase /tmp/pocketbase /usr/local/bin/pocketbase

# Copy built application and production dependencies
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy PocketBase configuration
COPY pb_hooks ./pb_hooks
COPY pb_migrations ./pb_migrations

# Copy Caddy configuration and entrypoint
COPY Caddyfile /etc/caddy/Caddyfile
COPY docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create data directory
RUN mkdir -p /pb_data

# Environment
ENV NODE_ENV=production

# Railway provides PORT; Caddy listens on it and proxies to internal services
EXPOSE 8080

# Use tini for proper signal handling of multiple processes
ENTRYPOINT ["/sbin/tini", "-g", "--"]
CMD ["/entrypoint.sh"]
