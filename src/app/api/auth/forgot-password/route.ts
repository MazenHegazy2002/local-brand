import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return 200 even if user doesn't exist to prevent email enumeration
      return NextResponse.json({ message: 'If an account with that email exists, we sent a reset link to it.' }, { status: 200 });
    }

    // Generate unique reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Store securely in DB using PasswordResetToken model
    await prisma.passwordResetToken.create({
      data: {
        email: user.email,
        token: resetToken,
        expires: tokenExpiry,
      }
    });

    // Mock sending email via Sendgrid or Nodemailer
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    console.log('\n--- MOCK SENDGRID EMAIL DISPATCH ---');
    console.log(`To: ${user.email}`);
    console.log(`Subject: LocalBrand Password Reset`);
    console.log(`Body: Please click this link to reset your password: ${resetLink}`);
    console.log('-------------------------------------\n');

    return NextResponse.json({ message: 'If an account with that email exists, we sent a reset link to it.' }, { status: 200 });

  } catch (error) {
    console.error('Forgot Password Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
