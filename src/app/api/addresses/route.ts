import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SessionUser } from '@/types';
import { addressSchema, updateAddressSchema } from '@/lib/validation';

// GET /api/addresses — fetch user's saved addresses
export async function GET(_req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as SessionUser).id;

    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ addresses }, { status: 200 });
  } catch (error) {
    console.error('[addresses] GET error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/addresses — add a new address
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as SessionUser).id;
    const body = await req.json();
    const validated = addressSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ message: validated.error.errors[0].message }, { status: 400 });
    }

    const { street, city, governorate, postalCode, isDefault } = validated.data;

    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: { userId, street, city, governorate, postalCode, isDefault: !!isDefault },
    });

    if (isDefault) {
      await prisma.user.update({
        where: { id: userId },
        data: { defaultAddressId: address.id },
      });
    }

    return NextResponse.json({ address }, { status: 201 });
  } catch (error) {
    console.error('[addresses] POST error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/addresses?id=xxx
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as SessionUser).id;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ message: 'Address ID required' }, { status: 400 });

    const address = await prisma.address.findUnique({ where: { id } });
    if (!address || address.userId !== userId) {
      return NextResponse.json({ message: 'Not found or forbidden' }, { status: 404 });
    }

    await prisma.address.delete({ where: { id } });
    return NextResponse.json({ message: 'Address deleted' }, { status: 200 });
  } catch (error) {
    console.error('[addresses] DELETE error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/addresses — update an existing address
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as SessionUser).id;
    const body = await req.json();
    const { id, ...rest } = body;

    if (!id) return NextResponse.json({ message: 'Address ID required' }, { status: 400 });

    const validated = updateAddressSchema.safeParse(rest);
    if (!validated.success) {
      return NextResponse.json({ message: validated.error.errors[0].message }, { status: 400 });
    }

    const { street, city, governorate, postalCode, isDefault } = validated.data;

    const existing = await prisma.address.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ message: 'Not found or forbidden' }, { status: 404 });
    }

    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });

      await prisma.user.update({
        where: { id: userId },
        data: { defaultAddressId: id },
      });
    }

    const updated = await prisma.address.update({
      where: { id },
      data: {
        street: street ?? undefined,
        city: city ?? undefined,
        governorate: governorate ?? undefined,
        postalCode: postalCode ?? undefined,
        isDefault: isDefault !== undefined ? !!isDefault : undefined,
      },
    });

    return NextResponse.json({ address: updated }, { status: 200 });
  } catch (error) {
    console.error('[addresses] PUT error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
