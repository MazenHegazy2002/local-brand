import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'products';

  let data: any[] = [];
  let filename = 'export';

  try {
    switch (type) {
      case 'products':
        data = await prisma.product.findMany({
          include: { seller: true, category: true, variants: true, images: true }
        });
        filename = 'products';
        break;
      case 'orders':
        data = await prisma.order.findMany({
          include: { items: true, user: true }
        });
        filename = 'orders';
        break;
      case 'users':
        data = await prisma.user.findMany({
          include: { sellerProfile: true }
        });
        filename = 'users';
        break;
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
