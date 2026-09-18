import zlib from 'zlib';
import { prisma } from './prisma';

export interface FullBackupPayload {
  exportedAt: string;
  cairoTime: string;
  version: string;
  system: {
    nodeVersion: string;
    environment: string;
    appUrl: string;
  };
  totalRecords: number;
  tables: Record<string, { count: number; rows: any[] }>;
}

export interface ExportBackupResult {
  fileName: string;
  gzFileName: string;
  uncompressedBytes: number;
  compressedBuffer: Buffer;
  payload: FullBackupPayload;
}

export async function generateFullDatabaseBackup(): Promise<ExportBackupResult> {
  const [
    users,
    sellerProfiles,
    products,
    productVariants,
    productImages,
    categories,
    tags,
    collections,
    orders,
    orderItems,
    reviews,
    disputes,
    productQAs,
    coupons,
    promoCodeUsages,
    affiliates,
    notifications,
    auditLogs,
    systemSettings,
    pages,
    homepageBanners,
  ] = await Promise.all([
    prisma.user.findMany().catch(() => []),
    prisma.sellerProfile.findMany().catch(() => []),
    prisma.product.findMany().catch(() => []),
    prisma.productVariant.findMany().catch(() => []),
    prisma.productImage.findMany().catch(() => []),
    prisma.category.findMany().catch(() => []),
    prisma.tag.findMany().catch(() => []),
    prisma.collection.findMany().catch(() => []),
    prisma.order.findMany().catch(() => []),
    prisma.orderItem.findMany().catch(() => []),
    prisma.review.findMany().catch(() => []),
    prisma.dispute.findMany().catch(() => []),
    prisma.productQA.findMany().catch(() => []),
    prisma.coupon.findMany().catch(() => []),
    prisma.promoCodeUsage.findMany().catch(() => []),
    prisma.affiliate.findMany().catch(() => []),
    prisma.notification.findMany({ take: 2000, orderBy: { createdAt: 'desc' } }).catch(() => []),
    prisma.auditLog.findMany({ take: 5000, orderBy: { createdAt: 'desc' } }).catch(() => []),
    prisma.systemSettings.findMany().catch(() => []),
    prisma.page.findMany().catch(() => []),
    prisma.homepageBanner.findMany().catch(() => []),
  ]);

  const tables: Record<string, { count: number; rows: any[] }> = {
    users: { count: users.length, rows: users },
    sellerProfiles: { count: sellerProfiles.length, rows: sellerProfiles },
    products: { count: products.length, rows: products },
    productVariants: { count: productVariants.length, rows: productVariants },
    productImages: { count: productImages.length, rows: productImages },
    categories: { count: categories.length, rows: categories },
    tags: { count: tags.length, rows: tags },
    collections: { count: collections.length, rows: collections },
    orders: { count: orders.length, rows: orders },
    orderItems: { count: orderItems.length, rows: orderItems },
    reviews: { count: reviews.length, rows: reviews },
    disputes: { count: disputes.length, rows: disputes },
    productQAs: { count: productQAs.length, rows: productQAs },
    coupons: { count: coupons.length, rows: coupons },
    promoCodeUsages: { count: promoCodeUsages.length, rows: promoCodeUsages },
    affiliates: { count: affiliates.length, rows: affiliates },
    notifications: { count: notifications.length, rows: notifications },
    auditLogs: { count: auditLogs.length, rows: auditLogs },
    systemSettings: { count: systemSettings.length, rows: systemSettings },
    pages: { count: pages.length, rows: pages },
    homepageBanners: { count: homepageBanners.length, rows: homepageBanners },
  };

  const totalRecords = Object.values(tables).reduce((acc, t) => acc + t.count, 0);

  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, '-');
  const cairoTime = now.toLocaleString('en-US', { timeZone: 'Africa/Cairo' });

  const payload: FullBackupPayload = {
    exportedAt: now.toISOString(),
    cairoTime,
    version: '2.0',
    system: {
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'production',
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://brandyy.shop',
    },
    totalRecords,
    tables,
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const uncompressedBuffer = Buffer.from(jsonString, 'utf-8');
  const compressedBuffer = zlib.gzipSync(uncompressedBuffer, { level: 9 });

  const fileName = `brandy-backup-${dateStr}.json`;
  const gzFileName = `brandy-backup-${dateStr}.json.gz`;

  return {
    fileName,
    gzFileName,
    uncompressedBytes: uncompressedBuffer.length,
    compressedBuffer,
    payload,
  };
}
