import { jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);

export interface MobileUser {
  id: string;
  role: string;
  email: string;
}

export async function getMobileUser(req: NextRequest): Promise<MobileUser | null> {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const { payload } = await jwtVerify(auth.slice(7), JWT_SECRET, { audience: 'mobile-access' });
    return payload as unknown as MobileUser;
  } catch {
    return null;
  }
}
