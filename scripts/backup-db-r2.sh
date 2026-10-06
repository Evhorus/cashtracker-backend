#!/usr/bin/env bash
# Automated backup: pg_dump -F c of the database in DATABASE_URL, verified with
# pg_restore --list, uploaded to a private R2 bucket (s3://$R2_BUCKET/cashtracker/)
# and rotated after REMOTE_KEEP_DAYS days. Meant for a scheduler (GitHub Actions
# workflow .github/workflows/db-backup.yml today; a server cron later): it needs
# only Docker and the environment variables below, no repo checkout state.
#
# Required env: DATABASE_URL, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET
# Optional env: HEALTHCHECK_URL (requested after a complete run, "$HEALTHCHECK_URL/fail" after a
#               failure: the convention of healthchecks.io and similar services)
#
# Manual local backups keep using scripts/backup-db.sh (`pnpm backup`).
set -Eeuo pipefail

REMOTE_KEEP_DAYS=30
# Pinned: the tools that receive the database and storage credentials must not change under the job.
PG_IMAGE=postgres:17
AWS_CLI_IMAGE=amazon/aws-cli:2.37.0

ping() { # ping "" on success, ping /fail on failure; a monitoring problem never fails the backup
  [ -n "${HEALTHCHECK_URL:-}" ] || return 0
  curl -fsS -m 10 --retry 3 -o /dev/null "${HEALTHCHECK_URL}$1" || true
}

DIR=$(mktemp -d)
chmod 700 "$DIR"
trap 'rm -rf "$DIR"' EXIT
trap 'ping /fail' ERR

for v in DATABASE_URL R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_ENDPOINT R2_BUCKET; do
  if [ -z "${!v:-}" ]; then
    echo "Error: $v is not set." >&2
    false
  fi
done

# The postgres image has no CA certificates: when the URL asks to verify the certificate, point it
# at the system bundle installed below (libpq rejects sslrootcert=system with a weaker sslmode).
URL="$DATABASE_URL"
case "$URL" in
  *sslmode=verify-full*|*sslmode=verify-ca*) URL="${URL}&sslrootcert=system" ;;
esac
NAME="cashtracker-prod-$(date -u +%Y%m%d-%H%M%S).dump"

pg() {
  docker run --rm -i -e DEBIAN_FRONTEND=noninteractive -e DATABASE_URL="$URL" -v "$DIR":/b "$PG_IMAGE" "$@"
}

pg sh -c 'apt-get update -qq && apt-get install -y -qq ca-certificates >/dev/null && update-ca-certificates >/dev/null && pg_dump "$DATABASE_URL" -F c -f "/b/'"$NAME"'"'
pg pg_restore --list "/b/$NAME" > "$DIR/list.txt"   # fail if the dump is unreadable
[ -s "$DIR/list.txt" ] || { echo "Error: $NAME looks empty." >&2; false; }
echo "$(date -u +%FT%TZ) ok dump $NAME $(du -h "$DIR/$NAME" | cut -f1), $(wc -l < "$DIR/list.txt") entries"

aws() {
  docker run --rm -e AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" -e AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
    -e AWS_DEFAULT_REGION=auto -v "$DIR":/b:ro "$AWS_CLI_IMAGE" --endpoint-url "$R2_ENDPOINT" "$@"
}
aws s3 cp "/b/$NAME" "s3://$R2_BUCKET/cashtracker/$NAME" --only-show-errors

# Remote rotation: object names carry the date (cashtracker-prod-YYYYMMDD-HHMMSS.dump).
CUTOFF=$(date -u -d "-$REMOTE_KEEP_DAYS days" +%Y%m%d)
aws s3 ls "s3://$R2_BUCKET/cashtracker/" | awk '{print $4}' | while read -r obj; do
  day=${obj#cashtracker-prod-}; day=${day%%-*}
  if [[ "$day" =~ ^[0-9]{8}$ ]] && [ "$day" -lt "$CUTOFF" ]; then
    aws s3 rm "s3://$R2_BUCKET/cashtracker/$obj" --only-show-errors
  fi
done
echo "$(date -u +%FT%TZ) ok off-site s3://$R2_BUCKET/cashtracker/$NAME"
ping ""
