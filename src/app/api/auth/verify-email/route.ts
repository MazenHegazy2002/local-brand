import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEmailBaseUrl } from '@/lib/email-verification';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/verify-email?token=<token>
 *
 * Consumes a PasswordResetToken that was created during registration to mark
 * the user's email as verified and then redirects to the dashboard (or
 * seller-hub for sellers).
 */
export async function GET(req: Request) {
  const baseUrl = getEmailBaseUrl();
  const { searchParams } = new URL(req.url, baseUrl);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=missing-token', baseUrl));
  }

  try {
    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!record) {
      return NextResponse.redirect(new URL('/login?error=invalid-token', baseUrl));
    }

    if (record.expires < new Date()) {
      // Garbage-collect expired token
      await prisma.passwordResetToken.delete({ where: { token } }).catch(() => {});
      return NextResponse.redirect(new URL('/verify-email?error=expired', baseUrl));
    }

    // Mark email as verified and consume the token atomically
    const user = await prisma.user.update({
      where: { email: record.email },
      data: { emailVerified: new Date() },
    });

    await prisma.passwordResetToken.delete({ where: { token } }).catch(() => {});

    // Redirect based on role — seller goes to their hub with a welcome banner
    const destination =
      user.role === 'SELLER'
        ? '/seller-hub?verified=1'
        : user.role === 'ADMIN'
          ? '/admin-os'
          : '/dashboard?verified=1';

    return NextResponse.redirect(new URL(destination, baseUrl));
  } catch (err) {
    console.error('[verify-email]', err);
    return NextResponse.redirect(new URL('/login?error=server-error', baseUrl));
  }
}
