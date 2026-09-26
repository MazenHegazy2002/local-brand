import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionUser } from '@/types';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createBrandSchema = z.object({
  name: z.string().min(2, 'Brand name must be at least 2 characters').max(80),
  nameAr: z.string().max(80).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  logoUrl: z.string().url().optional().or(z.literal('')).nullable(),
  coverUrl: z.string().url().optional().or(z.literal('')).nullable(),
  accentColor: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .optional()
    .default('#0f6b50'),
  status: z.enum(['ACTIVE', 'DRAFT']).optional().default('ACTIVE'),
});

async function getSellerProfile(userId: string) {
  return prisma.sellerProfile.findUnique({
    where: { userId },
    include: { brands: true },
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as SessionUser;
  const seller = await getSellerProfile(user.id);
  if (!seller) {
    return NextResponse.json({ message: 'Seller profile not found' }, { status: 404 });
  }

  const brands = await prisma.brand.findMany({
    where: { sellerId: seller.id },
    include: {
      _count: { select: { products: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({
    isMultiBrand: seller.isMultiBrand,
    brands,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as SessionUser;
  if (user.role !== 'SELLER' && user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Only sellers can create brands' }, { status: 403 });
  }

  const seller = await getSellerProfile(user.id);
  if (!seller) {
    return NextResponse.json({ message: 'Seller profile not found' }, { status: 404 });
  }

  if (!seller.isMultiBrand && seller.brands.length >= 1) {
    return NextResponse.json(
      {
        message:
          'Multi-brand feature is not enabled for your account. Please contact an admin to upgrade your account.',
      },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = createBrandSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Validation error', errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, nameAr, description, logoUrl, coverUrl, accentColor, status } = parsed.data;

  // Determine initial status:
  // Non-admin sellers requesting a brand must always be PENDING_APPROVAL
  // so admin can inspect and approve it before the brand goes live.
  const initialStatus = user.role === 'ADMIN' ? status || 'ACTIVE' : 'PENDING_APPROVAL';

  // Generate unique slug
  const baseSlug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'brand';
  let slug = baseSlug;
  let count = 1;
  while (await prisma.brand.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${count++}`;
  }

  const newBrand = await prisma.brand.create({
    data: {
      sellerId: seller.id,
      name,
      nameAr: nameAr || null,
      slug,
      description: description || null,
      logoUrl: logoUrl || null,
      coverUrl: coverUrl || null,
      accentColor: accentColor || '#0f6b50',
      status: initialStatus,
    },
    include: {
      _count: { select: { products: true } },
    },
  });

  // Notify admin when a new multi-brand approval is requested
  if (initialStatus === 'PENDING_APPROVAL') {
    try {
      const { sendEmail } = await import('@/lib/email');
      const adminEmail = process.env.ADMIN_ALERT_EMAIL || 'mazenhegazy6@gmail.com';
      await sendEmail({
        to: adminEmail,
        subject: `🏷️ New Brand Approval Request: "${name}" from ${seller.storeName}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
            <h2 style="color: #1e3b8a; margin-top: 0;">New Brand Approval Request</h2>
            <p style="color: #475569; font-size: 14px;">Multi-brand seller <strong>${seller.storeName}</strong> has requested to open a new brand on the marketplace:</p>
            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 16px 0;">
              <p style="margin: 4px 0;"><strong>Brand Name:</strong> ${name}</p>
              ${nameAr ? `<p style="margin: 4px 0;"><strong>Arabic Name:</strong> ${nameAr}</p>` : ''}
              <p style="margin: 4px 0;"><strong>Slug:</strong> ${slug}</p>
              ${description ? `<p style="margin: 4px 0;"><strong>Description:</strong> ${description}</p>` : ''}
              ${logoUrl ? `<p style="margin: 8px 0;"><strong>Logo:</strong><br><img src="${logoUrl}" alt="${name}" style="max-height: 48px; border-radius: 6px; margin-top: 4px;" /></p>` : ''}
            </div>
            <p style="margin-top: 20px;">
              <a href="https://brandyy.shop/admin-os" style="display: inline-block; background: #0f6e56; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
                Review in Admin OS
              </a>
            </p>
          </div>
        `,
      });
    } catch (notifyErr) {
      console.error('[seller/brands] Failed to send admin alert email:', notifyErr);
    }
  }

  return NextResponse.json({
    success: true,
    brand: newBrand,
    requiresApproval: initialStatus === 'PENDING_APPROVAL',
  });
}
