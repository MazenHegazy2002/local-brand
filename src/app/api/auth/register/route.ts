import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { registerSchema } from '@/lib/validation';
import { sendEmail } from '@/lib/email';
import {
  generateEmailVerificationEmail,
  generateSellerPendingEmail,
} from '@/lib/email-verification';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = registerSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ message: validated.error.errors[0].message }, { status: 400 });
    }

    const { name, email, password, role } = validated.data;
    // storeName is passed by the register form when role === SELLER
    const storeName: string = (body.storeName as string | undefined)?.trim() || `${name}'s Store`;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ message: 'User already exists' }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Default to BUYER if role is missing or invalid. Allow SELLER assignment.
    const userRole = role === 'SELLER' ? 'SELLER' : 'BUYER';

    // Create user — emailVerified is left null until the link is clicked
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        role: userRole,
      },
    });

    // If role is SELLER, initialize a SellerProfile with PENDING_APPROVAL status
    if (userRole === 'SELLER') {
      await prisma.sellerProfile.create({
        data: {
          userId: user.id,
          storeName,
          status: 'PENDING_APPROVAL',
        },
      });
    }

    // Claim any previous guest orders placed against this email
    let claimedOrders = 0;
    try {
      const claimed = await prisma.order.updateMany({
        where: { userId: null, guestEmail: email },
        data: { userId: user.id, guestEmail: null },
      });
      claimedOrders = claimed.count;
    } catch (err) {
      console.error('Failed to claim guest orders on registration:', err);
    }

    // ----------------------------------------------------------------
    // Create a 10-minute email-verification token and send the email
    // ----------------------------------------------------------------
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await prisma.passwordResetToken.create({
      data: { email, token, expires },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verifyUrl = `${appUrl}/api/auth/verify-email?token=${token}`;

    // Send email verification link
    await sendEmail({
      to: email,
      subject: 'Verify your Brandy email address',
      html: generateEmailVerificationEmail(name, verifyUrl),
    });

    // For new sellers also send a "your application is under review" email
    if (userRole === 'SELLER') {
      await sendEmail({
        to: email,
        subject: 'Your Brandy seller application is under review',
        html: generateSellerPendingEmail(name, storeName),
      });
    }

    return NextResponse.json(
      {
        message: 'Account created. Please check your email to verify your address.',
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        requiresVerification: true,
        claimedOrders,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
