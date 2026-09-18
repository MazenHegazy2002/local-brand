#!/usr/bin/env bash
# ==============================================================================
# Helper to install and configure rclone on Contabo VPS for Google Drive backups
# Target Folder: 1i4KjZxZDvkm_uibTCyjWQuuilKmuLMHW
# ==============================================================================

set -eo pipefail

echo "=================================================================="
echo " 🚀 Setting up Rclone on VPS for Google Drive Backups"
echo "=================================================================="

# 1. Install rclone if not installed
if ! command -v rclone >/dev/null 2>&1; then
  echo "📥 Installing rclone..."
  curl -s https://rclone.org/install.sh | sudo bash
  echo "✅ rclone installed: $(rclone --version | head -n 1)"
else
  echo "✅ rclone is already installed: $(rclone --version | head -n 1)"
fi

# 2. Check if 'gdrive' remote already exists
if rclone listremotes | grep -q "^gdrive:"; then
  echo "✅ 'gdrive' remote is already configured!"
  echo "Testing connection to Google Drive folder..."
  rclone lsd "gdrive:1i4KjZxZDvkm_uibTCyjWQuuilKmuLMHW" || rclone lsd "gdrive:" || true
  echo ""
  echo "Testing backup script now:"
  cd /opt/localbrand && ./scripts/vps-backup-to-gdrive.sh
  exit 0
fi

echo ""
echo "⚙️ Configuring 'gdrive' remote in rclone..."
echo "Follow the prompts below:"
echo " 1. Type: n (New remote)"
echo " 2. Name: gdrive"
echo " 3. Storage: drive"
echo " 4. client_id & client_secret: press Enter (leave blank)"
echo " 5. Scope: 1 (Full access)"
echo " 6. root_folder_id: 1i4KjZxZDvkm_uibTCyjWQuuilKmuLMHW"
echo " 7. service_account_file: press Enter"
echo " 8. Edit advanced config: n"
echo " 9. Use web browser: n"
echo " 10. Open the printed URL in your browser, copy the verification code and paste it here"
echo ""

rclone config

if rclone listremotes | grep -q "^gdrive:"; then
  echo ""
  echo "🎉 'gdrive' successfully configured!"
  echo "Running first backup..."
  cd /opt/localbrand && ./scripts/vps-backup-to-gdrive.sh
else
  echo "⚠️ 'gdrive' was not configured. You can re-run this script anytime: ./scripts/setup-rclone-vps.sh"
fi
