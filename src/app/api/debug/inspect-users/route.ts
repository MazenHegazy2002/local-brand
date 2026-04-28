import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        email: true,
        role: true,
        name: true,
        _count: true
      }
    });

    return NextResponse.json({ 
      success: true, 
      count: users.length,
      users: users 
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
