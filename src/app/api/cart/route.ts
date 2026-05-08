import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SessionUser } from '@/types';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const guestId = searchParams.get('guestId');

    // 1. Authenticated User Cart
    if (session) {
      const userId = (session.user as SessionUser).id;
      const dbCart = await prisma.cartItem.findMany({
        where: { userId },
        include: { variant: { include: { product: true } } }
      });
      return NextResponse.json({ cart: dbCart }, { status: 200 });
    }

    // 2. Guest Cart (Redis Backed)
    if (guestId) {
      const redisData = await redis.get(`cart:${guestId}`);
      return NextResponse.json({ cart: redisData ? JSON.parse(redisData) : [] }, { status: 200 });
    }

    return NextResponse.json({ cart: [] }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching cart' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { variantId, quantity, savedPrice, guestId } = body;

    // 1. Authenticated User Cart Update
    if (session) {
      const userId = (session.user as SessionUser).id;
      
      const cartItem = await prisma.cartItem.upsert({
        where: { userId_variantId: { userId, variantId } },
        update: { quantity, savedPrice },
        create: { userId, variantId, quantity, savedPrice }
      });
      
      return NextResponse.json({ message: 'Cart synced to DB successfully', item: cartItem }, { status: 200 });
    }

    // 2. Guest Cart (Redis Backed)
    if (guestId) {
      const currentCart = await redis.get(`cart:${guestId}`);
      let cart = currentCart ? JSON.parse(currentCart) : [];
      
      const existing = cart.find((item: { variantId: string }) => item.variantId === variantId);
      if (existing) {
        existing.quantity = quantity;
        existing.savedPrice = savedPrice;
      } else {
        cart.push({ variantId, quantity, savedPrice, addedAt: new Date() });
      }

      // Set expiry of guest cart for 7 days
      await redis.set(`cart:${guestId}`, JSON.stringify(cart), 'EX', 60 * 60 * 24 * 7);
      
      return NextResponse.json({ message: 'Cart synced to Redis successfully', cart }, { status: 200 });
    }

    return NextResponse.json({ message: 'Missing user session or guestId' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ message: 'Error saving cart' }, { status: 500 });
  }
}
