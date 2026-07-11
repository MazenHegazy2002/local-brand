import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { message: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    // Upsert — idempotent if they subscribe again
    await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: {}, // already subscribed — no-op
      create: { email },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Newsletter] Subscribe error:', err);
    return NextResponse.json({ message: 'An error occurred. Please try again.' }, { status: 500 });
  }
}
