import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionUser } from '@/types';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'products';

    if (type === 'products') {
      const products = await prisma.product.findMany({
        include: { seller: true, category: true, variants: true }
      });
      
      const csv = [
        'ID,Title,Description,Base Price,Seller,Category,Published,Variants Count',
        ...products.map(p => 
          `${p.id},"${p.title}","${p.description}",${p.basePrice},"${p.seller?.storeName || 'N/A'}","${p.category?.name || 'N/A'}",${p.published},${p.variants.length}`
        )
      ].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="products.csv"'
        }
      });
    }

    if (type === 'orders') {
      const orders = await prisma.order.findMany({
        include: { user: true, items: true }
      });

      const csv = [
        'ID,User Email,Total Amount,Status,Payment Status,Created At',
        ...orders.map(o => 
          `${o.id},"${o.user?.email || 'Guest'}",${o.totalAmount},${o.status},${o.paymentStatus},"${o.createdAt.toISOString()}"`
        )
      ].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="orders.csv"'
        }
      });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Export failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
