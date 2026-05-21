import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SessionUser } from '@/types';
import { z } from 'zod';
import { encryptSecret, readSecret, redactBankAccount } from '@/lib/secrets';

const settingsSchema = z.object({
  storeName: z.string().min(2).max(100).optional(),
  description: z.string().max(2000).optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  city: z.string().max(80).optional(),
  governorate: z.string().max(80).optional(),
  bankAccount: z.string().max(200).optional(),
});

// GET /api/seller/settings — fetch current seller's store settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as SessionUser).role;
    const userId = (session.user as SessionUser).id;
    if (role !== 'SELLER') {
      return NextResponse.json({ message: 'Seller account required' }, { status: 403 });
    }

    const seller = await prisma.sellerProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        storeName: true,
        description: true,
        logoUrl: true,
        city: true,
        governorate: true,
        bankAccount: true,
        commissionRate: true,
        status: true,
        balance: true,
      },
    });

    if (!seller) {
      return NextResponse.json({ message: 'Seller profile not found' }, { status: 404 });
    }

    // Bank accounts are encrypted at rest. We never return the cleartext to
    // the client — only a masked display string and a `bankAccountSet` flag
    // so the UI can show "you have a bank account on file" without ever
    // re-rendering the full number on the page.
    const decrypted = readSecret(seller.bankAccount);
    const { bankAccount: _ignored, ...safe } = seller;
    void _ignored;
    return NextResponse.json({
      seller: {
        ...safe,
        bankAccountMasked: redactBankAccount(decrypted),
        bankAccountSet: !!decrypted,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[seller/settings] GET error:', err);
    return NextResponse.json(
      { message: err.message || 'Failed to load settings' },
      { status: 500 }
    );
  }
}

// PATCH /api/seller/settings — update store settings
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as SessionUser).role;
    const userId = (session.user as SessionUser).id;
    if (role !== 'SELLER') {
      return NextResponse.json({ message: 'Seller account required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid settings payload', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const seller = await prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) {
      return NextResponse.json({ message: 'Seller profile not found' }, { status: 404 });
    }

    // Remove empty logo string so we don't overwrite with '' unintentionally.
    const data: Record<string, unknown> = { ...parsed.data };
    if (data.logoUrl === '') delete data.logoUrl;

    // Encrypt the bank account before write. If the seller didn't pass one,
    // skip the field entirely (so it doesn't clobber an existing value with
    // null/empty). If they passed an empty string, treat that as "clear".
    if (typeof parsed.data.bankAccount === 'string') {
      const trimmed = parsed.data.bankAccount.trim();
      if (trimmed === '') {
        data.bankAccount = null;
      } else {
        const enc = encryptSecret(trimmed);
        data.bankAccount = enc ?? trimmed; // fall back to plain only if no key configured
      }
    }

    const updated = await prisma.sellerProfile.update({
      where: { id: seller.id },
      data,
      select: {
        id: true,
        storeName: true,
        description: true,
        logoUrl: true,
        city: true,
        governorate: true,
        bankAccount: true,
        commissionRate: true,
        status: true,
        balance: true,
      },
    });

    const decrypted = readSecret(updated.bankAccount);
    const { bankAccount: _drop, ...safe } = updated;
    void _drop;
    return NextResponse.json({
      success: true,
      seller: {
        ...safe,
        bankAccountMasked: redactBankAccount(decrypted),
        bankAccountSet: !!decrypted,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[seller/settings] PATCH error:', err);
    return NextResponse.json(
      { message: err.message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}
