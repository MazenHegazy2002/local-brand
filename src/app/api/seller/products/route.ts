import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { jwtVerify } from 'jose';
import { createProduct } from '@/app/actions/seller';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);

async function getAuthUser(req: NextRequest) {
  // NextAuth session
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token) return { id: token.sub as string, role: token.role as string };

  // Mobile JWT
  const auth = req.headers.get('Authorization');
  if (auth?.startsWith('Bearer ')) {
    try {
      const { payload } = await jwtVerify(auth.slice(7), JWT_SECRET, {
        audience: 'mobile-access',
      });
      return { id: payload.id as string, role: payload.role as string };
    } catch {}
  }
  return null;
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'SELLER' && user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const seller = await prisma.sellerProfile.findUnique({ where: { userId: user.id } });
  if (!seller) return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });

  const products = await prisma.product.findMany({
    where: { sellerId: seller.id },
    select: {
      id: true,
      title: true,
      basePrice: true,
      published: true,
      images: { select: { url: true, isPrimary: true } },
      variants: { select: { stockCount: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({
    products: products.map(p => ({
      id: p.id,
      title: p.title,
      basePrice: Number(p.basePrice),
      published: p.published,
      images: p.images.map(i => i.url),
      stock: p.variants.reduce((sum, v) => sum + (v.stockCount ?? 0), 0),
    })),
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'SELLER' && user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const result = await createProduct({
    title: body.title,
    description: body.description,
    basePrice: body.basePrice ?? body.priceEGP,
    weightKg: body.weightKg ?? 0,
    categoryId: body.categoryId ?? '',
    variants:
      body.sizes?.length || body.colors?.length
        ? [
            {
              stock: body.stock ?? 0,
              sizes: body.sizes?.join(','),
              color: body.colors?.[0],
            },
          ]
        : [{ stock: body.stock ?? 0 }],
  });

  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ id: result.id }, { status: 201 });
}
