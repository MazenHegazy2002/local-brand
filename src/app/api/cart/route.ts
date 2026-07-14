import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SessionUser } from '@/types';

/**
 * GET /api/cart
 *   - Authenticated user → returns DB cart items joined to variant + product.
 *   - Guest with `?guestId=…` → reads the Redis-cached cart, then re-hydrates
 *     each item from the DB so the response shape matches the authenticated
 *     case (callers don't have to branch).
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const guestId = searchParams.get('guestId');

    if (session) {
      const userId = (session.user as SessionUser).id;
      const dbCart = await prisma.cartItem.findMany({
        where: { userId },
        include: {
          variant: {
            include: {
              product: {
                include: { images: { where: { isPrimary: true }, take: 1 } },
              },
            },
          },
        },
      });
      return NextResponse.json({ cart: dbCart }, { status: 200 });
    }

    if (guestId) {
      const redisData = await redis.get(`cart:${guestId}`);
      const stored: Array<{
        variantId: string;
        quantity: number;
        savedPrice: number;
        addedAt?: string;
      }> = redisData ? JSON.parse(redisData) : [];
      if (stored.length === 0) {
        return NextResponse.json({ cart: [] }, { status: 200 });
      }

      const variants = await prisma.productVariant.findMany({
        where: { id: { in: stored.map(s => s.variantId) } },
        include: {
          product: {
            include: { images: { where: { isPrimary: true }, take: 1 } },
          },
        },
      });
      const variantById = new Map(variants.map(v => [v.id, v]));

      // Drop any guest entries whose variant has been deleted, and shape the
      // payload identically to the authenticated case.
      const cart = stored
        .filter(s => variantById.has(s.variantId))
        .map(s => ({
          id: `guest:${s.variantId}`,
          userId: null as string | null,
          variantId: s.variantId,
          quantity: s.quantity,
          savedPrice: s.savedPrice,
          addedAt: s.addedAt ? new Date(s.addedAt) : new Date(),
          variant: variantById.get(s.variantId)!,
        }));

      return NextResponse.json({ cart }, { status: 200 });
    }

    return NextResponse.json({ cart: [] }, { status: 200 });
  } catch (error) {
    console.error('[cart] GET error:', error);
    return NextResponse.json({ message: 'Error fetching cart' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { variantId, quantity, guestId } = body;

    if (!variantId) {
      return NextResponse.json({ message: 'Missing variantId' }, { status: 400 });
    }

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      return NextResponse.json({ message: 'Variant not found' }, { status: 404 });
    }

    if (typeof quantity !== 'number' || quantity <= 0) {
      return NextResponse.json({ message: 'Quantity must be at least 1' }, { status: 400 });
    }

    if (variant.stockCount < quantity) {
      return NextResponse.json(
        { message: 'Requested quantity exceeds available stock' },
        { status: 400 }
      );
    }

    const resolvedPrice = variant.price;

    if (session) {
      const userId = (session.user as SessionUser).id;

      const cartItem = await prisma.cartItem.upsert({
        where: { userId_variantId: { userId, variantId } },
        update: { quantity, savedPrice: resolvedPrice },
        create: { userId, variantId, quantity, savedPrice: resolvedPrice },
      });

      return NextResponse.json(
        { message: 'Cart synced to DB successfully', item: cartItem },
        { status: 200 }
      );
    }

    if (guestId) {
      const currentCart = await redis.get(`cart:${guestId}`);
      const cart: Array<{
        variantId: string;
        quantity: number;
        savedPrice: number;
        addedAt: string;
      }> = currentCart ? JSON.parse(currentCart) : [];

      const existing = cart.find(item => item.variantId === variantId);
      if (existing) {
        existing.quantity = quantity;
        existing.savedPrice = resolvedPrice;
      } else {
        cart.push({
          variantId,
          quantity,
          savedPrice: resolvedPrice,
          addedAt: new Date().toISOString(),
        });
      }

      // 7-day TTL on guest carts.
      await redis.set(`cart:${guestId}`, JSON.stringify(cart), 'EX', 60 * 60 * 24 * 7);

      return NextResponse.json(
        { message: 'Cart synced to Redis successfully', cart },
        { status: 200 }
      );
    }

    return NextResponse.json({ message: 'Missing user session or guestId' }, { status: 400 });
  } catch (error) {
    console.error('[cart] POST error:', error);
    return NextResponse.json({ message: 'Error saving cart' }, { status: 500 });
  }
}
