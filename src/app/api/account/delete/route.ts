import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SessionUser } from '@/types';
import { BCRYPT_COST } from '@/lib/constants';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getRequestUser } from '@/lib/mobile-auth';
import { redis } from '@/lib/redis';
import { del } from '@vercel/blob';

// Orders in these states are finished, so the delivery address on them is no
// longer needed and is anonymised. Orders still in flight keep it until delivery
// (the courier needs it); see /delete-account for the public disclosure.
const FINISHED_ORDER_STATUSES = ['DELIVERED', 'CANCELLED', 'RETURNED'] as const;

// Keep only coarse location (city / governorate / country) for tax and reporting.
function anonymiseAddressSnapshot(snapshot: string): string {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(snapshot) ?? {};
  } catch {
    /* unparsable legacy snapshot: replace wholesale */
  }
  const keep = (k: string) => (typeof parsed[k] === 'string' ? (parsed[k] as string) : undefined);
  return JSON.stringify({
    fullName: 'Deleted User',
    street: '[deleted]',
    city: keep('city') ?? '',
    governorate: keep('governorate') ?? '',
    country: keep('country') ?? 'Egypt',
  });
}

// Best-effort removal of uploaded payment receipts from Vercel Blob. Other
// hosts (Cloudinary, inline data: URLs) are dropped with the DB reference.
async function deleteReceiptBlobs(urls: string[]) {
  const blobUrls = urls.filter(u => /^https:\/\/[^/]+\.blob\.vercel-storage\.com\//.test(u));
  if (!blobUrls.length || !process.env.BLOB_READ_WRITE_TOKEN) return;
  await del(blobUrls).catch(err => console.error('Receipt blob cleanup failed:', err));
}

// POST /api/account/delete — GDPR/PDPL + Google Play account deletion.
// Accepts the web session cookie or the app's Bearer token.
//
// Deleted: addresses, cart, wishlist, notifications, loyalty history, abandoned
// carts, support chats, admin role grants, push / refresh tokens, newsletter
// signup, password-reset and verification tokens. Anonymised: the user row,
// seller pickup / bank / tax / social details, affiliate payout details, seller
// and affiliate payout bank details, support-ticket contact details, and buyer
// PII on finished orders (address, sender number, receipt, notes). Pending
// seller / affiliate payout requests are cancelled (no bank details remain).
// Retained: order rows and amounts (tax/accounting), reviews and Q&A text
// (shown as "Deleted User"), disputes, commissions.
export async function POST(req: Request) {
  try {
    const user = await getRequestUser(req);
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const userId = user.id;

    if (user.role === 'ADMIN') {
      const admins = await prisma.user.count({ where: { role: 'ADMIN', deletedAt: null } });
      if (admins <= 1)
        return NextResponse.json(
          {
            message:
              'You are the only admin. Make another user an admin before deleting this account.',
          },
          { status: 400 }
        );
    }

    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        sellerProfile: { select: { id: true } },
        affiliate: { select: { id: true } },
      },
    });
    if (!current) return NextResponse.json({ message: 'User not found' }, { status: 404 });
    const originalEmail = current.email;
    const sellerId = current.sellerProfile?.id;
    const affiliateId = current.affiliate?.id;

    const orders = await prisma.order.findMany({
      where: { userId },
      select: { id: true, status: true, shippingAddressSnapshot: true, paymentReceiptUrl: true },
    });
    const receiptUrls = orders.map(o => o.paymentReceiptUrl).filter((u): u is string => !!u);

    // Soft delete + anonymise. The password is replaced with a real bcrypt hash
    // of an unknowable random value: comparisons then always return false,
    // which is safer than relying on bcrypt rejecting a malformed sentinel.
    const lockHash = await bcrypt.hash(crypto.randomBytes(48).toString('hex'), BCRYPT_COST);
    const now = new Date();

    await prisma.$transaction(
      async tx => {
        await tx.user.update({
          where: { id: userId },
          data: {
            deletedAt: now,
            email: `deleted_${userId}@brandy.invalid`,
            name: 'Deleted User',
            passwordHash: lockHash,
            phone: null,
            avatarUrl: null,
            defaultAddressId: null,
            referredBySlug: null,
            loyaltyPoints: 0,
          },
        });

        // Personal data owned only by this user: delete outright.
        await tx.address.deleteMany({ where: { userId } });
        await tx.cartItem.deleteMany({ where: { userId } });
        await tx.wishlist.deleteMany({ where: { userId } });
        await tx.notification.deleteMany({ where: { userId } });
        await tx.loyaltyTransaction.deleteMany({ where: { userId } });
        await tx.abandonedCart.deleteMany({ where: { userId } });
        await tx.conversation.deleteMany({ where: { userId } }); // messages cascade
        await tx.userAdminRole.deleteMany({ where: { userId } });
        await tx.passwordResetToken.deleteMany({ where: { email: originalEmail } });
        await tx.verificationToken.deleteMany({ where: { identifier: originalEmail } });
        await tx.newsletterSubscriber.deleteMany({ where: { email: originalEmail } });

        // Support tickets stay for the support history, without contact details.
        await tx.supportTicket.updateMany({
          where: { userId },
          data: { name: 'Deleted User', email: `deleted_${userId}@brandy.invalid` },
        });

        // Orders are kept for tax/accounting; strip buyer PII from them.
        await tx.order.updateMany({
          where: { userId },
          data: { paymentReceiptUrl: null, paymentSenderDetail: null, orderNotes: null },
        });
        for (const o of orders) {
          if (!(FINISHED_ORDER_STATUSES as readonly string[]).includes(o.status)) continue;
          await tx.order.update({
            where: { id: o.id },
            data: { shippingAddressSnapshot: anonymiseAddressSnapshot(o.shippingAddressSnapshot) },
          });
        }

        if (sellerId) {
          // The store row stays (orders and products reference it) but can no
          // longer sell and keeps no personal, contact or financial details.
          await tx.sellerProfile.update({
            where: { id: sellerId },
            data: {
              deletedAt: now,
              status: 'BANNED',
              pickupStreet: null,
              pickupBuilding: null,
              pickupPhone: null,
              pickupContactName: null,
              pickupGeo: null,
              pickupZone: null,
              pickupSubzone: null,
              bankAccount: null,
              taxNumber: null,
              facebookUrl: null,
              instagramUrl: null,
              tiktokUrl: null,
            },
          });
          await tx.payout.updateMany({
            where: { sellerId, status: 'PENDING' },
            data: { status: 'CANCELLED' },
          });
          await tx.payout.updateMany({ where: { sellerId }, data: { bankDetails: null } });
          await tx.brand.updateMany({ where: { sellerId }, data: { status: 'SUSPENDED' } });
          await tx.product.updateMany({
            where: { sellerId },
            data: { deletedAt: now, published: false },
          });
        }

        if (affiliateId) {
          // Commissions reference the affiliate row, so keep it but switch it
          // off (BANNED stops the promo code) and drop payout / profile details.
          await tx.affiliate.update({
            where: { id: affiliateId },
            data: {
              status: 'BANNED',
              payoutMethod: null,
              payoutDetails: null,
              platform: null,
              platformFollowers: null,
              categoryFocus: null,
              applicationNote: null,
            },
          });
          await tx.affiliatePayout.updateMany({
            where: { affiliateId, status: 'REQUESTED' },
            data: { status: 'REJECTED', adminNote: 'Account deleted by user' },
          });
          await tx.affiliatePayout.updateMany({
            where: { affiliateId },
            data: { payoutDetails: '[deleted]' },
          });
        }
      },
      { timeout: 30_000 }
    );

    // Sessions and device tokens live in Redis; failures here must not undo the deletion.
    await Promise.all(
      [`push:token:${userId}`, `push:${userId}`, `mobile:refresh:${userId}`].map(k =>
        redis.del(k).catch(() => 0)
      )
    );
    await deleteReceiptBlobs(receiptUrls);

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
