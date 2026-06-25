#!/bin/sh
set -e

# Ensure the SQLite data directory exists and is writable by the app user.
# Runs as root, then drops privileges. Handles root-owned mounted volumes.
DB_PATH="${DATABASE_PATH:-/data/is-bot.sqlite}"
DB_DIR="$(dirname "$DB_PATH")"
mkdir -p "$DB_DIR"
chown -R nextjs:nodejs "$DB_DIR" 2>/dev/null || true

exec gosu nextjs "$@"
