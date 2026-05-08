import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SessionUser } from '@/types';

// POST /api/account/delete — GDPR/PDPL-compliant account deletion
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as SessionUser).id;

    // Soft delete: set deletedAt timestamp, anonymize PII
    // We do NOT hard delete because order history is legally required
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        email: `deleted_${userId}@localbrand.invalid`, // anonymize
        name: 'Deleted User',
        passwordHash: '$2b$12$DELETED_USER_DELETED_USER_DELETED_USER_DELETED_USER', // cryptographically impossible hash sentinel
        phone: null,
        avatarUrl: null,
      }
    });

    // Soft delete seller profile if exists
    await prisma.sellerProfile.updateMany({
      where: { userId },
      data: { deletedAt: new Date(), status: 'BANNED' }
    });

    // Soft delete their products
    await prisma.product.updateMany({
      where: {
        seller: { userId }
      },
      data: { deletedAt: new Date(), published: false }
    });

    return NextResponse.json({ message: 'Account successfully deleted. Your data has been anonymized.' }, { status: 200 });

  } catch (error) {
    console.error('Account Deletion Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// GET /api/account/delete — Export personal data (PDPL compliance)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as SessionUser).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        orders: { include: { items: true } },
        addresses: true,
        reviews: true,
      }
    });

    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    // Return all personal data as JSON export
    const dataExport = {
      exportedAt: new Date().toISOString(),
      personalData: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
        loyaltyPoints: user.loyaltyPoints,
      },
      addresses: user.addresses,
      orderHistory: user.orders,
      reviews: user.reviews,
    };

    return NextResponse.json(dataExport, { 
      status: 200,
      headers: {
        'Content-Disposition': 'attachment; filename="localbrand-data-export.json"'
      }
    });

  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
