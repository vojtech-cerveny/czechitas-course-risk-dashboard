# syntax=docker/dockerfile:1

# ---- deps: install full deps (incl. native better-sqlite3 build) ----
FROM node:20-bookworm-slim AS deps
WORKDIR /app
# better-sqlite3 may compile from source if no prebuilt binary matches.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: build the Next.js standalone output ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runner: minimal runtime ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Bind to all interfaces. Without this, Next standalone uses Docker's auto-set
# HOSTNAME (the container id) and binds only to the container IP — so the public
# site works but 127.0.0.1 inside the container does not (breaks the scrape trigger).
ENV HOSTNAME=0.0.0.0
ENV DATABASE_PATH=/data/is-bot.sqlite

# gosu lets the entrypoint fix volume ownership as root, then drop to the app user.
RUN apt-get update && apt-get install -y --no-install-recommends gosu \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs \
    && mkdir -p /data && chown nextjs:nodejs /data

# Standalone server + static assets + public dir.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Drizzle migrations are applied at runtime (ensureMigrated reads ./drizzle).
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
# The native better-sqlite3 addon (kept external from the bundle).
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/bindings ./node_modules/bindings
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path
# Plain-Node trigger script for the Coolify Scheduled Task (node scripts/trigger.mjs).
COPY --from=builder --chown=nextjs:nodejs /app/scripts/trigger.mjs ./scripts/trigger.mjs
# Entrypoint ensures /data is writable, then drops to the nextjs user via gosu.
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Runs as root so the entrypoint can chown the (possibly root-owned) /data mount,
# then execs the server as the unprivileged nextjs user.
EXPOSE 3000
VOLUME ["/data"]

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
