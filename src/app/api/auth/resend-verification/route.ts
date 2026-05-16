import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { generateEmailVerificationEmail } from '@/lib/email-verification';

/**
 * POST /api/auth/resend-verification
 * Body: { email: string }
 *
 * Issues a fresh 10-minute token and resends the confirmation email.
 * Always returns 200 to avoid leaking whether the email exists.
 */
export async function POST(req: Request) {
  try {
    const { email } = (await req.json()) as { email?: string };
    if (!email) return NextResponse.json({ ok: true });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerified) {
      // Either no account or already verified — silently return
      return NextResponse.json({ ok: true });
    }

    // Delete any old verification tokens for this email to keep the table clean
    await prisma.passwordResetToken.deleteMany({ where: { email } }).catch(() => {});

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.passwordResetToken.create({
      data: { email, token, expires },
    });

    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/verify-email?token=${token}`;

    await sendEmail({
      to: email,
      subject: 'Verify your Brandy email address',
      html: generateEmailVerificationEmail(user.name, verifyUrl),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[resend-verification]', err);
    return NextResponse.json({ ok: true }); // still 200 to avoid enumeration
  }
}
