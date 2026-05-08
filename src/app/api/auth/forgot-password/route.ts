import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { forgotPasswordSchema } from '@/lib/validation';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = forgotPasswordSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ message: validated.error.errors[0].message }, { status: 400 });
    }

    const { email } = validated.data;

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

    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const { sendEmail } = await import('@/lib/email');
    await sendEmail({
      to: user.email,
      subject: 'LocalBrand Password Reset',
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link expires in 1 hour.</p>`,
    });

    return NextResponse.json({ message: 'If an account with that email exists, we sent a reset link to it.' }, { status: 200 });

  } catch {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
