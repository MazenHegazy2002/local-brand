import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';
import { decideImportRequest } from '@/lib/website-import-run';

export const maxDuration = 300;

// POST /api/admin/products/import-requests/[id] { approve: boolean }
// Admins only. Approving runs the import into the requested seller's store.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(req);
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only admins can approve imports.' }, { status: 403 });
  }
  const { id } = await ctx.params;
  const { approve } = (await req.json().catch(() => ({}))) as { approve?: boolean };
  if (typeof approve !== 'boolean') {
    return NextResponse.json({ error: 'Approve or reject?' }, { status: 400 });
  }

  const out = await decideImportRequest({ id, adminId: user.id, approve });

  await prisma.auditLog
    .create({
      data: {
        adminId: user.id,
        action: approve ? 'APPROVE_PRODUCT_IMPORT' : 'REJECT_PRODUCT_IMPORT',
        targetId: id,
        details: JSON.stringify(out),
      },
    })
    .catch(() => {});

  return out.ok
    ? NextResponse.json(out)
    : NextResponse.json({ error: out.error }, { status: out.status });
}
