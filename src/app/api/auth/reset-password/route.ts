import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { resetPasswordSchema } from '@/lib/validation';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = resetPasswordSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ message: validated.error.errors[0].message }, { status: 400 });
    }

    const { token, password } = validated.data;

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
