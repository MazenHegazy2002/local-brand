import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionUser } from '@/types';
import { rmaUpdateSchema } from '@/lib/validation';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user)
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const role = (session.user as SessionUser).role;
    if (role !== 'ADMIN' && role !== 'SELLER') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const resolvedParams = await params;
    const body = await req.json();
    const validated = rmaUpdateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { message: 'Invalid data', errors: validated.error.format() },
        { status: 400 }
      );
    }

    const { status, adminNotes } = validated.data;

    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: resolvedParams.id },
      include: {
        orderItem: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!returnRequest) {
      return NextResponse.json({ message: 'Return request not found' }, { status: 404 });
    }

    if (role === 'SELLER') {
      const sellerProfile = await prisma.sellerProfile.findUnique({
        where: { userId: (session.user as SessionUser).id },
      });
      if (!sellerProfile || returnRequest.orderItem.variant.product.sellerId !== sellerProfile.id) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
    }

    // Update return request
    const updated = await prisma.returnRequest.update({
      where: { id: resolvedParams.id },
      data: {
        status,
        adminNotes,
      },
    });

    // Update order item status based on return status
    let itemStatus = returnRequest.orderItem.status;
    if (status === 'APPROVED') {
      itemStatus = 'RETURNED';
    } else if (status === 'REJECTED') {
      itemStatus = 'DELIVERED'; // Revert to delivered
    }

    await prisma.orderItem.update({
      where: { id: returnRequest.orderItemId },
      data: { status: itemStatus },
    });

    return NextResponse.json(
      {
        message: `Return request ${status.toLowerCase()}`,
        returnRequest: updated,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error('RMA Update Error:', err);
    return NextResponse.json({ message: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
