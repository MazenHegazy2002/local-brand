import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { jwtVerify } from 'jose';
import { createProduct } from '@/app/actions/seller';

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
