import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Multi-seller cart checkout — splits 1 cart into N sub-orders (1 per seller)
 * POST /api/checkout/split
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const { cartItems, addressInfo, paymentMethod, couponId } = await req.json();

    if (!cartItems?.length) return NextResponse.json({ message: 'Cart is empty' }, { status: 400 });

    // ── 1. Group cart items by seller ─────────────────────────────────────────
    const sellerGroups: Record<string, typeof cartItems> = {};

    for (const item of cartItems) {
      const product = await prisma.product.findUnique({
        where: { id: item.id },
        include: { variants: true, seller: true }
      });
      if (!product) throw new Error(`Product ${item.name} not found`);

      const variant = product.variants[0];
      if (!variant || variant.stockCount < item.qty) {
        throw new Error(`${product.title} is out of stock`);
      }

      const sellerId = product.sellerId;
      if (!sellerGroups[sellerId]) sellerGroups[sellerId] = [];
      sellerGroups[sellerId].push({ ...item, product, variant });
    }

    // ── 2. Create one sub-order per seller ────────────────────────────────────
    const createdOrders = [];

    for (const [sellerId, items] of Object.entries(sellerGroups)) {
      let subtotal = 0;
      const orderItemsData = [];

      for (const item of items) {
        // Atomic stock decrement
        const updated = await prisma.productVariant.updateMany({
          where: { id: item.variant.id, stockCount: { gte: item.qty } },
          data: { stockCount: { decrement: item.qty } }
        });
        if (updated.count === 0) throw new Error(`Concurrency error: ${item.product.title} just sold out`);

        const price = item.product.basePrice;
        subtotal += price * item.qty;

        orderItemsData.push({
          variantId: item.variant.id,
          productTitleSnapshot: item.product.title,
          sellerNameSnapshot: item.product.seller.storeName,
          priceAtPurchase: price,
          quantity: item.qty,
          status: 'PENDING',
        });
      }

      const vatAmount = subtotal * 0.14;
      const shippingFee = 50;
      const totalAmount = subtotal + vatAmount + shippingFee;

      const order = await prisma.order.create({
        data: {
          userId,
          totalAmount,
          shippingFee,
          paymentMethod: paymentMethod === 'CREDIT_CARD' ? 'CREDIT_CARD' : 'CASH_ON_DELIVERY',
          paymentStatus: paymentMethod === 'CASH_ON_DELIVERY' ? 'UNPAID' : 'PAID',
          status: 'CONFIRMED',
          shippingAddressSnapshot: JSON.stringify(addressInfo),
          items: { create: orderItemsData as any }
        }
      });

      createdOrders.push({ orderId: order.id, sellerId, subtotal, totalAmount });
    }

    // ── 3. Award loyalty points (1 point per EGP spent) ───────────────────────
    const totalSpent = createdOrders.reduce((sum, o) => sum + o.subtotal, 0);
    const pointsEarned = Math.floor(totalSpent); // 1 EGP = 1 point

    await prisma.user.update({
      where: { id: userId },
      data: { loyaltyPoints: { increment: pointsEarned } }
    });

    return NextResponse.json({
      message: `Checkout complete. ${createdOrders.length} sub-order(s) created.`,
      orders: createdOrders,
      loyaltyPoints: { earned: pointsEarned, message: `+${pointsEarned} loyalty points added!` }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Split Checkout Error:', error);
    return NextResponse.json({ message: error.message || 'Checkout failed' }, { status: 500 });
  }
}
