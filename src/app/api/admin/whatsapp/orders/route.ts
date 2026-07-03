import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SessionUser } from '@/types';

/**
 * GET /api/admin/whatsapp/orders
 *
 * Admin-only endpoint to retrieve order lists and stats for the WhatsApp bot panel.
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';

    // Fetch last 200 orders to keep it highly performant
    const orders = await prisma.order.findMany({
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    // Map and filter orders in memory
    const formattedOrders = orders.map(order => {
      let customerName = 'Guest Customer';
      let phone = '';
      try {
        const address = JSON.parse(order.shippingAddressSnapshot);
        customerName = address.fullName || order.user?.name || 'Guest Customer';
        phone = address.phone || '';
      } catch {
        customerName = order.user?.name || 'Guest Customer';
      }

      return {
        id: order.id,
        customerName,
        phone,
        email: order.guestEmail || order.user?.email || '',
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        orderStatus: order.status,
        whatsappConfirmStatus: order.whatsappConfirmStatus,
        whatsappMessageId: order.whatsappMessageId,
        whatsappLastSentAt: order.whatsappLastSentAt
          ? order.whatsappLastSentAt.toISOString()
          : null,
        createdAt: order.createdAt.toISOString(),
      };
    });

    const filtered = formattedOrders.filter(o => {
      // Apply status filter
      if (status !== 'all' && o.whatsappConfirmStatus !== status) {
        return false;
      }
      // Apply search keyword filter (ID, Customer name, Phone)
      if (search) {
        const query = search.toLowerCase();
        return (
          o.id.toLowerCase().includes(query) ||
          o.customerName.toLowerCase().includes(query) ||
          o.phone.includes(query)
        );
      }
      return true;
    });

    // Calculate database totals across all orders
    const statsAgg = await prisma.order.groupBy({
      by: ['whatsappConfirmStatus'],
      _count: {
        _all: true,
      },
    });

    const stats = {
      NOT_SENT: 0,
      PENDING_RESPONSE: 0,
      CONFIRMED: 0,
      CANCELLED: 0,
      NO_REPLY: 0,
      FAILED: 0,
      total: 0,
    };

    for (const item of statsAgg) {
      const key = item.whatsappConfirmStatus as keyof typeof stats;
      if (key in stats) {
        (stats[key] as number) = item._count._all;
      }
      stats.total += item._count._all;
    }

    return NextResponse.json({ orders: filtered, stats });
  } catch (error: any) {
    console.error('[WhatsApp Orders API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
