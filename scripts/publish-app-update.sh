#!/usr/bin/env bash
# Publish an instant (over-the-air) update of the mobile app to brandyy.shop.
#
#   scripts/publish-app-update.sh "Short description of the change"
#
# Phones running a store build with the same runtimeVersion (mobile/app.json)
# download it the next time they open the app. Changes that need new native
# code or permissions still need a store release with a new runtimeVersion.
# Roll back from Admin OS > Mobile app > Instant app updates.
set -euo pipefail

MSG="${1:?Pass a short description of the update}"
HOST="${DEPLOY_HOST:-root@169.58.133.158}"
VOLUME="/var/lib/docker/volumes/localbrand_uploads_data/_data/app-updates"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/mobile"

RUNTIME=$(node -p "require('./app.json').expo.runtimeVersion")
ID=$(uuidgen | tr 'A-Z' 'a-z')
COMMIT=$(git rev-parse HEAD)
OUT=$(mktemp -d)

echo "Exporting app update $ID (runtime $RUNTIME)…"
npx expo export --platform android --platform ios --output-dir "$OUT" >/dev/null
npx expo config --json --type public > "$OUT/expoConfig.json"

echo "Uploading…"
ssh "$HOST" "mkdir -p $VOLUME/$ID"
tar -C "$OUT" -czf - . | ssh "$HOST" "tar -C $VOLUME/$ID -xzf - && chown -R 1001:65533 $VOLUME/$ID"

SQL_MSG=${MSG//\'/\'\'}
ssh "$HOST" "docker exec localbrand-db-1 psql -U postgres -d localbrand -v ON_ERROR_STOP=1 -qc \
  \"insert into \\\"AppUpdate\\\" (id, \\\"runtimeVersion\\\", message, \\\"gitCommit\\\", platforms) values ('$ID', '$RUNTIME', '$SQL_MSG', '$COMMIT', 'android,ios')\""
rm -rf "$OUT"
echo "Published $ID. Phones get it the next time they open the app."
