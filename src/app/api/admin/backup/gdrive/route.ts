import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { SessionUser } from '@/types';
import { prisma } from '@/lib/prisma';
import { generateFullDatabaseBackup } from '@/lib/backup-exporter';
import { getGoogleDriveCredentials, uploadFileToGoogleDrive } from '@/lib/gdrive';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export const DEFAULT_GDRIVE_FOLDER_ID = '1i4KjZxZDvkm_uibTCyjWQuuilKmuLMHW';

export async function POST(req: Request) {
  // 1. Authorize: Either Admin Session OR Cron Secret Bearer
  const session = await getServerSession(authOptions);
  const isAdmin = session && (session.user as SessionUser).role === 'ADMIN';

  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isAdmin && !isCron) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const userEmail = isAdmin ? (session.user as SessionUser).email : 'cron-worker';

  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || DEFAULT_GDRIVE_FOLDER_ID;
    const credentials = getGoogleDriveCredentials();

    if (!credentials) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Google Drive credentials not configured. Please set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in your deployment environment.',
          folderId,
        },
        { status: 400 }
      );
    }

    // 2. Generate full database backup & compress
    const backup = await generateFullDatabaseBackup();

    // 3. Upload to Google Drive folder
    const uploadResult = await uploadFileToGoogleDrive({
      folderId,
      fileName: backup.gzFileName,
      mimeType: 'application/gzip',
      body: backup.compressedBuffer,
      credentials,
    });

    // 4. Log audit record
    if (isAdmin && session?.user) {
      await prisma.auditLog
        .create({
          data: {
            adminId: (session.user as SessionUser).id,
            action: 'GDRIVE_BACKUP_UPLOADED',
            details: JSON.stringify({
              fileId: uploadResult.fileId,
              fileName: uploadResult.fileName,
              folderId,
              recordsCount: backup.payload.totalRecords,
              uncompressedBytes: backup.uncompressedBytes,
              compressedBytes: backup.compressedBuffer.length,
            }),
          },
        })
        .catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: 'Backup uploaded to Google Drive successfully',
      fileId: uploadResult.fileId,
      fileName: uploadResult.fileName,
      folderId,
      folderUrl: `https://drive.google.com/drive/folders/${folderId}`,
      fileUrl:
        uploadResult.webViewLink || `https://drive.google.com/file/d/${uploadResult.fileId}/view`,
      totalRecords: backup.payload.totalRecords,
      uncompressedSizeKb: Math.round(backup.uncompressedBytes / 1024),
      compressedSizeKb: Math.round(backup.compressedBuffer.length / 1024),
      exportedAt: backup.payload.exportedAt,
      cairoTime: backup.payload.cairoTime,
    });
  } catch (error: any) {
    console.error('[backup/gdrive] Backup failed:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Backup to Google Drive failed',
      },
      { status: 500 }
    );
  }
}
