// GET   /api/admin/feature-flags  — all flags
// PATCH /api/admin/feature-flags  — toggle / update a flag
// POST  /api/admin/feature-flags  — create a new flag
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { SessionUser } from '@/types';
import { prisma } from '@/lib/prisma';

// Seed list of built-in flags that appear even before the admin toggles them.
export const DEFAULT_FLAGS = [
  {
    key: 'virtual-tryon',
    label: 'Virtual Try-On AI',
    description: 'Show "Try It On" button on product pages (requires Gemini API key)',
    scope: 'ALL',
  },
  {
    key: 'affiliate-program',
    label: 'Affiliate Program',
    description: 'Enable affiliate sign-up page and referral tracking',
    scope: 'ALL',
  },
  {
    key: 'flash-sales',
    label: 'Flash Sales',
    description: 'Show flash-sale countdown timers and dedicated /flash-sales page',
    scope: 'ALL',
  },
  {
    key: 'bulk-product-import',
    label: 'Bulk Product Import (XLSX)',
    description: 'Allow sellers to upload XLSX files to create products in bulk',
    scope: 'SELLER',
  },
  {
    key: 'live-notifications',
    label: 'Live Push Notifications (SSE)',
    description: 'Real-time in-app notifications via Server-Sent Events (requires Redis)',
    scope: 'ALL',
  },
  {
    key: 'seller-analytics',
    label: 'Seller Analytics Dashboard',
    description: 'Show the revenue / order analytics tab in Seller Hub',
    scope: 'SELLER',
  },
  {
    key: 'product-qa',
    label: 'Product Q&A',
    description: 'Allow buyers to ask questions on product pages; sellers can answer',
    scope: 'ALL',
  },
  {
    key: 'disputes',
    label: 'Dispute Center',
    description: 'Enable buyer-initiated order disputes (admin arbitration)',
    scope: 'ALL',
  },
  {
    key: 'lookbook',
    label: 'Lookbook / Editorial',
    description: 'Show the curated /lookbook page in nav and footer',
    scope: 'ALL',
  },
  {
    key: 'maintenance-mode',
    label: 'Maintenance Mode',
    description: 'Redirect non-admins to /maintenance page (toggle from Settings too)',
    scope: 'ADMIN',
  },
];

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser).role !== 'ADMIN') return null;
  return session.user as SessionUser;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  // Ensure all default flags exist (upsert with current value)
  await Promise.all(
    DEFAULT_FLAGS.map(f =>
      prisma.featureFlag.upsert({
        where: { key: f.key },
        create: { ...f, enabled: false },
        update: { label: f.label, description: f.description },
      })
    )
  );

  const flags = await prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  return NextResponse.json({ flags });
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { key, enabled, scope } = body as {
    key: string;
    enabled?: boolean;
    scope?: string;
  };

  if (!key) return NextResponse.json({ message: 'key is required' }, { status: 400 });

  const flag = await prisma.featureFlag.upsert({
    where: { key },
    create: {
      key,
      label: key,
      enabled: enabled ?? false,
      scope: scope ?? 'ALL',
    },
    update: {
      ...(enabled !== undefined ? { enabled } : {}),
      ...(scope !== undefined ? { scope } : {}),
    },
  });

  return NextResponse.json({ flag });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { key, label, description, scope } = body as {
    key: string;
    label: string;
    description?: string;
    scope?: string;
  };

  if (!key || !label) {
    return NextResponse.json({ message: 'key and label are required' }, { status: 400 });
  }

  const flag = await prisma.featureFlag.create({
    data: {
      key: key.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      label,
      description: description ?? '',
      scope: scope ?? 'ALL',
      enabled: false,
    },
  });

  return NextResponse.json({ flag });
}
