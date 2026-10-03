import { jwtVerify } from 'jose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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
    return payload as unknown as MobileUser;
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
