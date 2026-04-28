import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/addresses — fetch user's saved addresses
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;

  const addresses = await prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
  });

  return NextResponse.json({ addresses }, { status: 200 });
}

// POST /api/addresses — add a new address
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const { street, city, governorate, postalCode, isDefault } = await req.json();

  if (!street || !city || !governorate) {
    return NextResponse.json({ message: 'street, city, and governorate are required' }, { status: 400 });
  }

  // If new address is default, remove default from others
  if (isDefault) {
    await prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false }
    });
  }

  const address = await prisma.address.create({
    data: { userId, street, city, governorate, postalCode, isDefault: !!isDefault }
  });

  // Update user's defaultAddressId if this is default
  if (isDefault) {
    await prisma.user.update({
      where: { id: userId },
      data: { defaultAddressId: address.id }
    });
  }

  return NextResponse.json({ address }, { status: 201 });
}

// DELETE /api/addresses?id=xxx
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ message: 'Address ID required' }, { status: 400 });

  const address = await prisma.address.findUnique({ where: { id } });
  if (!address || address.userId !== userId) {
    return NextResponse.json({ message: 'Not found or forbidden' }, { status: 404 });
  }

  await prisma.address.delete({ where: { id } });
  return NextResponse.json({ message: 'Address deleted' }, { status: 200 });
}

// PUT /api/addresses — update an existing address
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const { id, street, city, governorate, postalCode, isDefault } = await req.json();

  if (!id) return NextResponse.json({ message: 'Address ID required' }, { status: 400 });

  const existing = await prisma.address.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ message: 'Not found or forbidden' }, { status: 404 });
  }

  // If setting this as default, unset others
  if (isDefault) {
    await prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false }
    });
    
    await prisma.user.update({
      where: { id: userId },
      data: { defaultAddressId: id }
    });
  }

  const updated = await prisma.address.update({
    where: { id },
    data: {
      street: street ?? undefined,
      city: city ?? undefined,
      governorate: governorate ?? undefined,
      postalCode: postalCode ?? undefined,
      isDefault: isDefault !== undefined ? !!isDefault : undefined
    }
  });

  return NextResponse.json({ address: updated }, { status: 200 });
}
