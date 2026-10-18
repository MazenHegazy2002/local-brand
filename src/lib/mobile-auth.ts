import { jwtVerify } from 'jose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SessionUser } from '@/types';

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);

export interface MobileUser {
  id: string;
  role: string;
  email: string;
}

export async function getMobileUser(req: Request): Promise<MobileUser | null> {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const { payload } = await jwtVerify(auth.slice(7), JWT_SECRET, { audience: 'mobile-access' });
    // The token's role can be stale: re-read it so a demoted or suspended user loses access now,
    // not when the token expires (the cookie session re-reads it the same way).
    const user = await prisma.user.findUnique({
      where: { id: String(payload.id) },
      select: { id: true, role: true, email: true, deletedAt: true },
    });
    if (!user || user.deletedAt) return null;
    return { id: user.id, role: user.role, email: user.email };
  } catch {
    return null;
  }
}

// Bearer token (mobile app) if sent, otherwise the web session cookie.
// A Bearer request must never fall back to cookies: proxy.ts skips CSRF for
// Bearer requests, so a cookie fallback would reopen CSRF.
export async function getRequestUser(req: Request): Promise<{ id: string; role: string } | null> {
  if (req.headers.get('authorization')?.startsWith('Bearer ')) {
    const m = await getMobileUser(req);
    return m ? { id: m.id, role: m.role } : null;
  }
  const u = (await getServerSession(authOptions))?.user as SessionUser | undefined;
  return u ? { id: u.id, role: u.role } : null;
}

export async function getRequestUserId(req: Request): Promise<string | null> {
  return (await getRequestUser(req))?.id ?? null;
}

// Drop-in for getServerSession(authOptions) in routes the mobile app also calls:
// a Bearer token yields a session-shaped object, otherwise the cookie session.
export async function getRequestSession(
  req: Request
): Promise<{ user: { id: string; role: string; email?: string } } | null> {
  if (req.headers.get('authorization')?.startsWith('Bearer ')) {
    const m = await getMobileUser(req);
    return m ? { user: { id: m.id, role: m.role, email: m.email } } : null;
  }
  return (await getServerSession(authOptions)) as {
    user: { id: string; role: string; email?: string };
  } | null;
}
