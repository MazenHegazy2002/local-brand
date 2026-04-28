import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Check DB
    const userCount = await prisma.user.count();
    
    return NextResponse.json({ 
      status: "OK", 
      database: "Connected",
      timestamp: new Date().toISOString(),
      userCount
    });
  } catch (error: any) {
    return NextResponse.json({ 
      status: "ERROR", 
      database: "Disconnected",
      error: error.message 
    }, { status: 500 });
  }
}
