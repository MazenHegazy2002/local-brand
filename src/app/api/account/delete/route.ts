import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SessionUser } from '@/types';
import { BCRYPT_COST } from '@/lib/constants';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// POST /api/account/delete — GDPR/PDPL-compliant account deletion
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as SessionUser).id;

    // Soft delete: set deletedAt timestamp, anonymize PII. The password is
    // replaced with a real bcrypt hash of an unknowable random value rather
    // than a hand-rolled "sentinel" string — relying on bcrypt failing to
    // parse a malformed hash is fragile (some bcrypt implementations throw,
    // others always return false). With a real hash, comparisons just always
    // return false, which is exactly what we want.
    const lockHash = await bcrypt.hash(crypto.randomBytes(48).toString('hex'), BCRYPT_COST);
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        email: `deleted_${userId}@brandy.invalid`, // anonymize
        name: 'Deleted User',
        passwordHash: lockHash,
        phone: null,
        avatarUrl: null,
      },
    });

    // Soft delete seller profile if exists
    await prisma.sellerProfile.updateMany({
      where: { userId },
      data: { deletedAt: new Date(), status: 'BANNED' },
    });

    // Soft delete their products
    await prisma.product.updateMany({
      where: {
        seller: { userId },
      },
      data: { deletedAt: new Date(), published: false },
    });

    return NextResponse.json(
      { message: 'Account successfully deleted. Your data has been anonymized.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Account Deletion Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// GET /api/account/delete — Export personal data (PDPL compliance)
export async function GET() {
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
      },
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
        'Content-Disposition': 'attachment; filename="brandy-data-export.json"',
      },
    });
  } catch (error) {
    console.error('Account Data Export Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
