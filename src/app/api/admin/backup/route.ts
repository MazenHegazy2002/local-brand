// Admin Backup API.
//
// GET /api/admin/backup — Downloads a full JSON-formatted dump of key operational models.
//
// Requires ADMIN authorization.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { SessionUser } from '@/types';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser).role !== 'ADMIN') return null;
  return session.user as SessionUser;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [
      users,
      sellerProfiles,
      products,
      categories,
      tags,
      collections,
      productVariants,
      productImages,
      orders,
      orderItems,
      reviews,
      productQAs,
      systemSettings,
      pages,
      coupons,
      disputes,
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.sellerProfile.findMany(),
      prisma.product.findMany(),
      prisma.category.findMany(),
      prisma.tag.findMany(),
      prisma.collection.findMany(),
      prisma.productVariant.findMany(),
      prisma.productImage.findMany(),
      prisma.order.findMany(),
      prisma.orderItem.findMany(),
      prisma.review.findMany(),
      prisma.productQA.findMany(),
      prisma.systemSettings.findMany(),
      prisma.page.findMany(),
      prisma.coupon.findMany(),
      prisma.dispute.findMany(),
    ]);

    const backupData = {
      exportedAt: new Date().toISOString(),
      exportedBy: admin.email,
      version: '1.0',
      tables: {
        users: { count: users.length, records: users },
        sellerProfiles: { count: sellerProfiles.length, records: sellerProfiles },
        products: { count: products.length, records: products },
        categories: { count: categories.length, records: categories },
        tags: { count: tags.length, records: tags },
        collections: { count: collections.length, records: collections },
        productVariants: { count: productVariants.length, records: productVariants },
        productImages: { count: productImages.length, records: productImages },
        orders: { count: orders.length, records: orders },
        orderItems: { count: orderItems.length, records: orderItems },
        reviews: { count: reviews.length, records: reviews },
        productQAs: { count: productQAs.length, records: productQAs },
        systemSettings: { count: systemSettings.length, records: systemSettings },
        pages: { count: pages.length, records: pages },
        coupons: { count: coupons.length, records: coupons },
        disputes: { count: disputes.length, records: disputes },
      },
    };

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'DB_BACKUP_DOWNLOADED',
        details: JSON.stringify({
          version: '1.0',
          recordsCount: Object.values(backupData.tables).reduce((acc, t) => acc + t.count, 0),
        }),
      },
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="brandy-backup-${dateStr}.json"`,
      },
    });
  } catch (err) {
    const e = err as Error;
    return NextResponse.json({ message: e.message || 'Backup failed' }, { status: 500 });
  }
}
