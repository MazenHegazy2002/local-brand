import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// Magic-link sign-in. The user submits an email; we either look up an
// existing account or auto-create one (with an unguessable random
// passwordHash so the credentials provider can't authenticate against it
// until the user explicitly sets a real password). Then we mint a
// single-use token, store it in the PasswordResetToken table (same shape),
// and email a link to /auth/magic?token=...
const requestSchema = z.object({
  email: z.string().email().max(254),
  // Optional human-readable name for auto-created accounts. The checkout
  // page passes the buyer's full name when they came from a guest order.
  name: z.string().min(1).max(120).optional(),
});

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes — long enough to find the email

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.errors[0].message }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const fallbackName = parsed.data.name?.trim() || email.split('@')[0] || 'Customer';

    // Find or create the user. Auto-created accounts get a random
    // unguessable hash so attempting password login fails until the user
    // sets a real password through /account/set-password.
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const placeholder = await bcrypt.hash(crypto.randomBytes(48).toString('hex'), 10);
      user = await prisma.user.create({
        data: {
          email,
          name: fallbackName,
          passwordHash: placeholder,
          role: 'BUYER',
        },
      });
    } else if (user.deletedAt) {
      // Don't leak deletion state — pretend success.
      return NextResponse.json(
        { message: 'If an account with that email exists, we sent a sign-in link.' },
        { status: 200 }
      );
    }

    // Issue a single-use token. We don't aggressively delete prior tokens
    // for this email so that a user receiving multiple emails (e.g. retries)
    // can still click any of the links — they'll all be valid until used or
    // expired. The PasswordResetToken FK on email guarantees the user row
    // exists, which is why we created the user above first.
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.passwordResetToken.create({
      data: {
        email,
        token,
        expires: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const link = `${baseUrl}/auth/magic?token=${token}`;

    const { sendEmail } = await import('@/lib/email');
    await sendEmail({
      to: email,
      subject: 'Your Brandy sign-in link',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h1 style="color: #1e3b8a; margin: 0 0 16px;">Sign in to Brandy</h1>
          <p style="color: #444; line-height: 1.6;">
            Hi ${fallbackName}, click the button below to sign in. The link is good
            for 30 minutes and can only be used once.
          </p>
          <p style="margin: 24px 0;">
            <a href="${link}"
               style="display: inline-block; background: #1e3b8a; color: #fff; font-weight: bold;
                      padding: 12px 24px; border-radius: 8px; text-decoration: none;">
              Sign in to Brandy
            </a>
          </p>
          <p style="color: #888; font-size: 13px; line-height: 1.6;">
            Or paste this URL into your browser:<br/>
            <code style="word-break: break-all;">${link}</code>
          </p>
          <p style="color: #aaa; font-size: 12px; margin-top: 32px;">
            Didn't request this? You can safely ignore the email — your account
            won't be touched.
          </p>
        </div>
      `,
    });

    return NextResponse.json(
      {
        message: 'If an account with that email exists, we sent a sign-in link.',
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[magic-link] error:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
