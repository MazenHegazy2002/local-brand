import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const user = await prisma.user.findUnique({
    where: { id: (session.user as { id: string }).id },
  });
  return user?.role === 'ADMIN' ? session : null;
}

// DELETE /api/admin/flash-sales/[productId]
// Removes all flash sale fields from the product (cancels the flash sale).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { productId } = await params;

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    await prisma.product.update({
      where: { id: productId },
      data: {
        flashSalePrice: null,
        flashSaleStartsAt: null,
        flashSaleEndsAt: null,
        flashSaleLimit: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/flash-sales] DELETE error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
