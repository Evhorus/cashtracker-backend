#!/usr/bin/env bash
# Restores a pg_dump -F c backup (see scripts/backup-db.sh) into an explicit
# target database, via Docker (no local Postgres client required).
#
# Usage:
#   scripts/restore-db.sh "<target_connection_string>" [dump_file]
#   pnpm restore -- "<target_connection_string>" [dump_file]
#
# - target_connection_string is REQUIRED and must be typed/pasted explicitly -
#   it is never read from .env, so a restore can't silently land on whatever
#   DATABASE_URL happens to be configured right now.
# - dump_file defaults to the most recent file in backups/.
# - If the target host matches the prod host in .env's DATABASE_URL, an extra
#   typed confirmation ("SI") is required before anything runs.
# - Uses --clean --if-exists so it's safe against both an empty database and
#   one that already has the schema (existing objects are dropped and
#   recreated instead of erroring out).

set -euo pipefail

cd "$(dirname "$0")/.."

if [ $# -lt 1 ]; then
  echo "Usage: scripts/restore-db.sh \"<target_connection_string>\" [dump_file]" >&2
  exit 1
fi

TARGET_URL="$1"
FILE="${2:-}"

if [ -z "$FILE" ]; then
  FILE=$(ls -t backups/*.dump 2>/dev/null | head -1) || true
  if [ -z "$FILE" ]; then
    echo "Error: no dump file given and none found in backups/." >&2
    exit 1
  fi
else
  case "$FILE" in
    backups/*) ;;
    *) FILE="backups/${FILE}" ;;
  esac
fi

if [ ! -f "$FILE" ]; then
  echo "Error: dump file not found: $FILE" >&2
  exit 1
fi

extract_host() {
  # crude but sufficient: postgres[ql]://user:pass@HOST:port/db...
  echo "$1" | sed -E 's#^[a-zA-Z]+://[^@]*@([^/:?]+).*#\1#'
}

TARGET_HOST=$(extract_host "$TARGET_URL")

PROD_HOST=""
if [ -f .env ]; then
  PROD_URL=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d'=' -f2-)
  if [ -n "$PROD_URL" ]; then
    PROD_HOST=$(extract_host "$PROD_URL")
  fi
fi

echo "=================================================="
echo " RESTORE"
echo "  dump file:    $FILE ($(du -h "$FILE" | cut -f1))"
echo "  target host:  $TARGET_HOST"
echo "=================================================="
echo "This will DROP and recreate objects in the target database."
echo

if [ -n "$PROD_HOST" ] && [ "$TARGET_HOST" = "$PROD_HOST" ]; then
  echo "!! WARNING: target host matches the prod DATABASE_URL host in .env !!"
  echo "This looks like it would restore over PRODUCTION."
  read -r -p "Type SI (all caps) to continue restoring over prod, anything else aborts: " confirm
  if [ "$confirm" != "SI" ]; then
    echo "Aborted."
    exit 1
  fi
else
  read -r -p "Continue with restore into $TARGET_HOST? [y/N] " confirm
  case "$confirm" in
    y|Y|yes|YES) ;;
    *) echo "Aborted."; exit 1 ;;
  esac
fi

echo "Restoring..."
docker run --rm -i -e TARGET_URL="$TARGET_URL" -e DEBIAN_FRONTEND=noninteractive -v "$(pwd)/backups:/backups" postgres:17 \
  sh -c 'apt-get update -qq && apt-get install -y -qq ca-certificates >/dev/null && update-ca-certificates >/dev/null && pg_restore -d "$TARGET_URL" --clean --if-exists --no-owner --no-privileges -v "/backups/'"$(basename "$FILE")"'"'

echo
echo "Done. Spot-check row counts / app behavior against the target before relying on it."
