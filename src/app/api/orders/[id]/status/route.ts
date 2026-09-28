import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionUser } from '@/types';
import { orderStatusUpdateSchema } from '@/lib/validation';
import { changeOrderStatus } from '@/lib/order-status';

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const validated = orderStatusUpdateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ message: validated.error.errors[0].message }, { status: 400 });
    }

    const { id } = await context.params;
    const user = session.user as SessionUser;
    const result = await changeOrderStatus(
      { id: user.id, role: user.role },
      id,
      validated.data.status
    );
    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: result.httpStatus });
    }

    return NextResponse.json(
      { message: 'Order status updated', order: result.order },
      { status: 200 }
    );
  } catch (error) {
    console.error('Order Status Update Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
