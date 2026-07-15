import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import crypto from 'crypto';

export async function GET() {
  try {
    const num1 = Math.floor(Math.random() * 9) + 1; // 1-9
    const num2 = Math.floor(Math.random() * 9) + 1; // 1-9
    const question = `What is ${num1} + ${num2}?`;
    const answer = String(num1 + num2);

    const captchaId = crypto.randomUUID();

    // Store in Redis with a 3-minute expiration
    await redis.set(`captcha:${captchaId}`, answer, 'EX', 180);

    return NextResponse.json({ captchaId, question }, { status: 200 });
  } catch (error) {
    console.error('[captcha] error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
