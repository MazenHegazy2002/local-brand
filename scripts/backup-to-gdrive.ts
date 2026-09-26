/**
 * Standalone Backup to Google Drive CLI Script
 *
 * Usage:
 *   npx tsx scripts/backup-to-gdrive.ts
 *   or: npx tsx scripts/backup-to-gdrive.ts /path/to/custom-file.sql.gz
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';

import { getGoogleDriveCredentials, uploadFileToGoogleDrive } from '../src/lib/gdrive';

const DEFAULT_FOLDER_ID = '1i4KjZxZDvkm_uibTCyjWQuuilKmuLMHW';

async function main() {
  console.log('🚀 Starting Brandy Backup to Google Drive...');

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || DEFAULT_FOLDER_ID;
  console.log(`📁 Target Google Drive Folder: https://drive.google.com/drive/folders/${folderId}`);

  const credentials = getGoogleDriveCredentials();
  if (!credentials) {
    console.error('❌ Error: Google Drive credentials not found.');
    console.error('Please configure either:');
    console.error('  1. GOOGLE_SERVICE_ACCOUNT_JSON=\'{"type":"service_account",...}\'');
    console.error(
      '  2. GOOGLE_SERVICE_ACCOUNT_EMAIL=... and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=...'
    );
    process.exit(1);
  }

  console.log(`🔑 Authenticating as: ${credentials.clientEmail}`);

  const customFilePath = process.argv[2];

  if (customFilePath && fs.existsSync(customFilePath)) {
    // Direct file upload mode (e.g. pg_dump or tar archive from VPS)
    const fileName = path.basename(customFilePath);
    console.log(`📦 Reading file: ${customFilePath} (${fileName})...`);
    const fileBuffer = fs.readFileSync(customFilePath);
    console.log(
      `📤 Uploading ${fileName} (${Math.round(fileBuffer.length / 1024)} KB) to Google Drive...`
    );

    const res = await uploadFileToGoogleDrive({
      folderId,
      fileName,
      mimeType: fileName.endsWith('.gz') ? 'application/gzip' : 'application/octet-stream',
      body: fileBuffer,
      credentials,
    });

    console.log(`✅ Upload completed successfully!`);
    console.log(`📄 File ID: ${res.fileId}`);
    if (res.webViewLink) console.log(`🔗 Link: ${res.webViewLink}`);
    return;
  }

  // Full database export mode
  console.log('📊 Exporting database tables and system state...');
  const { generateFullDatabaseBackup } = await import('../src/lib/backup-exporter');
  const backup = await generateFullDatabaseBackup();
  console.log(
    `✅ Exported ${backup.payload.totalRecords} records across ${Object.keys(backup.payload.tables).length} tables.`
  );
  console.log(
    `🗜️  Compressed size: ${Math.round(backup.compressedBuffer.length / 1024)} KB (Uncompressed: ${Math.round(backup.uncompressedBytes / 1024)} KB)`
  );

  console.log(`📤 Uploading ${backup.gzFileName} to Google Drive folder...`);
  const res = await uploadFileToGoogleDrive({
    folderId,
    fileName: backup.gzFileName,
    mimeType: 'application/gzip',
    body: backup.compressedBuffer,
    credentials,
  });

  console.log(`🎉 Backup to Google Drive succeeded!`);
  console.log(`📄 File ID: ${res.fileId}`);
  console.log(
    `🔗 Direct URL: ${res.webViewLink || `https://drive.google.com/file/d/${res.fileId}/view`}`
  );
  console.log(`📁 Folder: https://drive.google.com/drive/folders/${folderId}`);
}

main().catch(err => {
  console.error('❌ Backup failed with error:', err);
  process.exit(1);
});
