import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getRequestUserId } from '@/lib/mobile-auth';

const select = { name: true, email: true, phone: true, avatarUrl: true, emailVerified: true };

// Same fields as the web dashboard's Settings tab (updateProfile server action).
const profileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  phone: z.string().trim().max(30).nullable().optional(),
  // No length cap: local dev uploads come back as data: URLs (see /api/upload).
  avatarUrl: z.string().url().nullable().optional(),
});

// GET /api/user/profile — the signed-in user's editable profile
export async function GET(req: Request) {
  const userId = await getRequestUserId(req);
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId }, select });
  if (!user) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  return NextResponse.json({ user });
}

// PATCH /api/user/profile — update name / phone / avatar
export async function PATCH(req: Request) {
  const userId = await getRequestUserId(req);
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const parsed = profileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }
  const { name, phone, avatarUrl } = parsed.data;
  const user = await prisma.user.update({
    where: { id: userId },
    data: { name, phone: phone || null, ...(avatarUrl !== undefined && { avatarUrl }) },
    select,
  });
  return NextResponse.json({ user });
}
