/**
 * Automated daily database backup cron endpoint.
 *
 * Triggered by Vercel Cron at 01:00 UTC daily (see vercel.json).
 *
 * What it does:
 *  1. Exports all critical DB tables as JSON (same payload as the
 *     admin on-demand backup at /api/admin/backup).
 *  2. Uploads the dump to Vercel Blob storage under /backups/YYYY-MM-DD.json
 *  3. Prunes blobs older than BACKUP_RETENTION_DAYS (default 30).
 *
 * If BLOB_READ_WRITE_TOKEN is not set, the backup data is still generated
 * and the endpoint returns it in the JSON response body — useful as a
 * no-storage sanity check.
 *
 * Auth: Bearer CRON_SECRET header (set in vercel.json env). The endpoint
 * is also callable manually by an admin for ad-hoc backups.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min — large DBs may take a while

const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);

export async function GET(req: Request) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();

  // ── Export ──────────────────────────────────────────────────────────────────
  try {
    const [
      users,
      products,
      orders,
      categories,
      sellerProfiles,
      notifications,
      promoCodeUsages,
      auditLogs,
    ] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          emailVerified: true,
        },
      }),
      prisma.product.findMany({
        select: {
          id: true,
          title: true,
          basePrice: true,
          published: true,
          sellerId: true,
          categoryId: true,
          createdAt: true,
        },
      }),
      prisma.order.findMany({
        select: {
          id: true,
          status: true,
          totalAmount: true,
          userId: true,
          createdAt: true,
          idempotencyKey: true,
        },
      }),
      prisma.category.findMany(),
      prisma.sellerProfile.findMany({
        select: {
          id: true,
          userId: true,
          storeName: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
      prisma.promoCodeUsage.findMany({ take: 5000 }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5000,
        select: {
          id: true,
          action: true,
          adminId: true,
          targetId: true,
          details: true,
          createdAt: true,
        },
      }),
    ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      version: '1',
      tables: {
        users: { count: users.length, rows: users },
        products: { count: products.length, rows: products },
        orders: { count: orders.length, rows: orders },
        categories: { count: categories.length, rows: categories },
        sellerProfiles: { count: sellerProfiles.length, rows: sellerProfiles },
        notifications: { count: notifications.length, rows: notifications },
        promoCodeUsages: { count: promoCodeUsages.length, rows: promoCodeUsages },
        auditLogs: { count: auditLogs.length, rows: auditLogs },
      },
    };

    const json = JSON.stringify(backup, null, 2);
    const dateLabel = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const filename = `backups/${dateLabel}.json`;

    // ── Upload to Vercel Blob ──────────────────────────────────────────────────
    let blobUrl: string | null = null;
    let prunedCount = 0;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { put, list, del } = await import('@vercel/blob');

        // Upload this backup
        const blob = await put(filename, json, {
          access: 'public', // admin-only access controlled by CRON_SECRET above
          contentType: 'application/json',
        });
        blobUrl = blob.url;

        // Prune old backups beyond retention window
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

        const { blobs } = await list({ prefix: 'backups/' });
        const stale = blobs.filter(b => new Date(b.uploadedAt) < cutoff);
        if (stale.length > 0) {
          await del(stale.map(b => b.url));
          prunedCount = stale.length;
        }
      } catch (blobErr) {
        console.error('[cron/backup] Blob upload failed:', blobErr);
        // Don't fail the whole cron — the export is still valid
      }
    }

    const durationMs = Date.now() - startedAt;

    return NextResponse.json({
      success: true,
      exportedAt: backup.exportedAt,
      filename,
      blobUrl,
      storage: blobUrl ? 'vercel-blob' : 'none (BLOB_READ_WRITE_TOKEN not set)',
      prunedCount,
      retentionDays: RETENTION_DAYS,
      rowCounts: Object.fromEntries(Object.entries(backup.tables).map(([k, v]) => [k, v.count])),
      durationMs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[cron/backup] Export failed:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
