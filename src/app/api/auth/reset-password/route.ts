import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ message: 'Token and new password required' }, { status: 400 });
    }

    // Find valid token
    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { token }
    });

    if (!tokenRecord) {
      return NextResponse.json({ message: 'Invalid or expired reset token' }, { status: 400 });
    }

    if (tokenRecord.expires < new Date()) {
      // Clean up expired token
      await prisma.passwordResetToken.delete({ where: { token } });
      return NextResponse.json({ message: 'Reset token has expired. Please request a new one.' }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password
    await prisma.user.update({
      where: { email: tokenRecord.email },
      data: { passwordHash: hashedPassword }
    });

    // Delete token so it can't be reused
    await prisma.passwordResetToken.delete({ where: { token } });

    return NextResponse.json({ message: 'Password updated successfully' }, { status: 200 });

  } catch (error) {
    console.error('Reset Password Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
