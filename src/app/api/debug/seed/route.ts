import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    // Create 3 Test Users
    const testUsers = [
      { email: 'admin@localbrand.com', name: 'System Admin', role: 'ADMIN', pass: 'admin123' },
      { email: 'seller@localbrand.com', name: 'Elite Seller', role: 'SELLER', pass: 'seller123' },
      { email: 'buyer@localbrand.com', name: 'Frequent Buyer', role: 'BUYER', pass: 'buyer123' }
    ];

    const results = [];

    for (const u of testUsers) {
      const hashedPassword = await bcrypt.hash(u.pass, 10);
      const user = await prisma.user.upsert({
        where: { email: u.email },
        update: { role: u.role as any },
        create: { 
          email: u.email, 
          name: u.name, 
          role: u.role as any, 
          passwordHash: hashedPassword 
        }
      });

      if (u.role === 'SELLER') {
        await prisma.sellerProfile.upsert({
          where: { userId: user.id },
          update: { status: 'ACTIVE' },
          create: { userId: user.id, storeName: "Elite Local Goods", status: 'ACTIVE' }
        });
      }
      
      results.push(`Created/Updated ${u.role}: ${u.email}`);
    }

    // Create system settings
    const settings = [
      { key: "VAT_RATE", value: "14.0", description: "Value Added Tax percentage" },
      { key: "COMMISSION_BASE", value: "15.0", description: "Base platform commission" }
    ];
    for (const s of settings) {
      await prisma.systemSettings.upsert({
        where: { key: s.key },
        update: {},
        create: s
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Database initialized with test accounts",
      details: results
    });

  } catch (error: any) {
    console.error('Seed Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
