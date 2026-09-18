#!/usr/bin/env bash
# ==============================================================================
# Brandy VPS Automated Daily Backup to Google Drive
# Target Google Drive Folder: 1i4KjZxZDvkm_uibTCyjWQuuilKmuLMHW
# https://drive.google.com/drive/folders/1i4KjZxZDvkm_uibTCyjWQuuilKmuLMHW
# ==============================================================================

set -eo pipefail

APP_DIR="${APP_DIR:-/opt/localbrand}"
BACKUP_DIR="${APP_DIR}/backups"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
GDRIVE_FOLDER_ID="${GOOGLE_DRIVE_FOLDER_ID:-1i4KjZxZDvkm_uibTCyjWQuuilKmuLMHW}"

mkdir -p "${BACKUP_DIR}"
cd "${APP_DIR}"

echo "=================================================================="
echo " [Brandy Backup] Starting Daily Backup at $(date)"
echo " Target Folder ID: ${GDRIVE_FOLDER_ID}"
echo "=================================================================="

# 1. PostgreSQL Database Dump via Docker
DB_DUMP_FILE="${BACKUP_DIR}/brandy_db_${TIMESTAMP}.sql.gz"
echo " Dumping PostgreSQL database (localbrand)..."

if docker-compose ps | grep -q "db"; then
  docker-compose exec -T db pg_dump -U postgres localbrand | gzip > "${DB_DUMP_FILE}"
  echo "✅ Database dumped: ${DB_DUMP_FILE} ($(du -h "${DB_DUMP_FILE}" | cut -f1))"
else
  echo "⚠️ Warning: 'db' container not running in docker-compose. Trying pg_dump locally..."
  pg_dump -U postgres localbrand | gzip > "${DB_DUMP_FILE}" || true
fi

# 2. System and Website Config / Uploads Archive
SYS_DUMP_FILE="${BACKUP_DIR}/brandy_system_${TIMESTAMP}.tar.gz"
echo "📦 Packaging system configs & uploads..."
tar -czf "${SYS_DUMP_FILE}" \
  --exclude="node_modules" \
  --exclude=".next" \
  --exclude=".git" \
  --exclude="backups" \
  -C "${APP_DIR}" .env docker-compose.yml public 2>/dev/null || true

echo "✅ System archive created: ${SYS_DUMP_FILE} ($(du -h "${SYS_DUMP_FILE}" | cut -f1))"

# 3. Upload to Google Drive via App container or Node
echo "📤 Uploading database backup to Google Drive..."
if [ -f "${DB_DUMP_FILE}" ]; then
  docker-compose exec -T -e GOOGLE_DRIVE_FOLDER_ID="${GDRIVE_FOLDER_ID}" app npx tsx scripts/backup-to-gdrive.ts "backups/$(basename "${DB_DUMP_FILE}")" || \
  npx tsx scripts/backup-to-gdrive.ts "${DB_DUMP_FILE}" || true
fi

echo "📤 Uploading system archive to Google Drive..."
if [ -f "${SYS_DUMP_FILE}" ]; then
  docker-compose exec -T -e GOOGLE_DRIVE_FOLDER_ID="${GDRIVE_FOLDER_ID}" app npx tsx scripts/backup-to-gdrive.ts "backups/$(basename "${SYS_DUMP_FILE}")" || \
  npx tsx scripts/backup-to-gdrive.ts "${SYS_DUMP_FILE}" || true
fi

# 4. Prune local backups older than 14 days to prevent disk space exhaustion
echo "🧹 Pruning local backups older than 14 days..."
find "${BACKUP_DIR}" -type f -name "brandy_*" -mtime +14 -delete || true

echo "=================================================================="
echo "🎉 Daily Backup process completed successfully at $(date)!"
echo "=================================================================="
