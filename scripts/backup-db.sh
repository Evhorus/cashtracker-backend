#!/usr/bin/env bash
# Takes a full, restorable backup (schema + data) of the database pointed to
# by DATABASE_URL in .env, using `pg_dump -F c` run inside a postgres:17
# Docker container (no local Postgres client required).
#
# Usage: pnpm backup   (or: bash scripts/backup-db.sh)
#
# Restore with:
#   pg_restore -d <target_connection_string> backups/<file>.dump
# Never restore into prod without explicitly confirming the target.

set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Error: .env not found in project root." >&2
  exit 1
fi

# Don't `source .env` - DATABASE_URL has an unquoted `&` (channel_binding=require)
# that breaks shell parsing. Extract it directly instead.
DATABASE_URL=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d'=' -f2-)

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL not found in .env." >&2
  exit 1
fi

# postgres:17 image has no CA certs by default; add sslrootcert=system so
# `sslmode=verify-full` (kept, not weakened) can actually verify against the
# system CA bundle we install below.
DATABASE_URL="${DATABASE_URL}&sslrootcert=system"

ts=$(date +%Y%m%d-%H%M%S)
file="cashtracker-prod-${ts}.dump"
mkdir -p backups

echo "Dumping database to backups/${file} ..."
docker run --rm -e DATABASE_URL="$DATABASE_URL" -e DEBIAN_FRONTEND=noninteractive -v "$(pwd)/backups:/backups" postgres:17 \
  sh -c 'apt-get update -qq && apt-get install -y -qq ca-certificates >/dev/null && update-ca-certificates >/dev/null && pg_dump "$DATABASE_URL" -F c -f "/backups/'"$file"'"'

# Container writes as root - fix ownership before touching the file locally.
docker run --rm -v "$(pwd)/backups:/backups" postgres:17 chown "$(id -u):$(id -g)" "/backups/${file}"
chmod 600 "backups/${file}"

echo "Verifying dump..."
listing=$(docker run --rm -v "$(pwd)/backups:/backups" postgres:17 pg_restore --list "/backups/${file}")
if [ -z "$listing" ]; then
  echo "Error: backups/${file} looks empty - pg_restore --list returned nothing." >&2
  exit 1
fi

echo "OK: backups/${file} ($(du -h "backups/${file}" | cut -f1), $(echo "$listing" | wc -l) entries), permissions $(stat -c '%a' "backups/${file}")"
echo
echo "Restore with:"
echo "  pg_restore -d <target_connection_string> backups/${file}"
