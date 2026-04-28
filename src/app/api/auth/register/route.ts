import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ message: 'User already exists' }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Default to BUYER if role is missing or invalid. Allow SELLER assignment.
    const userRole = role === 'SELLER' ? 'SELLER' : 'BUYER';

    // Create user in DB
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        role: userRole,
      }
    });

    // If role is SELLER, initialize empty SellerProfile
    if (userRole === 'SELLER') {
      await prisma.sellerProfile.create({
        data: {
          userId: user.id,
          storeName: `${name}'s Store`, // Default starter name
        }
      });
    }

    return NextResponse.json({ 
      message: 'User created successfully', 
      user: { id: user.id, name: user.name, email: user.email, role: user.role } 
    }, { status: 201 });

  } catch (error) {
    console.error('Registration Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
