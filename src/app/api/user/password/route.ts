import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BCRYPT_COST } from '@/lib/constants';
import type { SessionUser } from '@/types';

// Sets / updates the password on the *current* user's account. Used by the
// post-magic-link "set a password" page so first-time customers can pick a
// password they'll remember for future credentials sign-ins.
const schema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long'),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as SessionUser).id;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.errors[0].message }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_COST);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return NextResponse.json({ message: 'Password updated' }, { status: 200 });
  } catch (err) {
    console.error('[user/password] error:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
