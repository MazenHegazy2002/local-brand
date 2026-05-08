import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { registerSchema } from '@/lib/validation';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = registerSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ message: validated.error.errors[0].message }, { status: 400 });
    }

    const { name, email, password, role } = validated.data;

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
