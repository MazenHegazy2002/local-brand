import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// This is an EMERGENCY BYPASS route for debugging purposes.
// It should be deleted after successful verification.
export async function GET() {
  try {
    const seller = await prisma.user.findFirst({
      where: { role: 'SELLER', email: 'seller@localbrand.com' }
    });

    if (!seller) {
      return NextResponse.json({ error: "Seller account not found. Please run /api/debug/seed first." }, { status: 404 });
    }

    // Since we can't manually set a cookie for NextAuth easily here,
    // we'll just return a success message and instructions.
    // However, I will update the Login page to have a "Bypass" button in debug mode.
    
    return NextResponse.json({ 
      success: true, 
      message: "Bypass mode active. Please check the login page for a temporary 'Debug Login' button.",
      seller: { id: seller.id, email: seller.email }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
