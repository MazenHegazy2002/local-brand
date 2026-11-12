import { SignJWT } from 'jose';
import { redis } from '@/lib/redis';

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
export const ACCESS_TTL = 60 * 60; // 1 h
const REFRESH_TTL = 60 * 60 * 24 * 30; // 30 d

type TokenUser = {
  id: string;
  role: string;
  email: string;
  name: string;
  avatarUrl: string | null;
};

// Access + refresh tokens for the mobile app (same shape for password and Google sign-in).
export async function issueMobileTokens(user: TokenUser) {
  const payload = { id: user.id, role: user.role, email: user.email };
  const accessToken = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL}s`)
    .setAudience('mobile-access')
    .sign(JWT_SECRET);
  const refreshToken = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TTL}s`)
    .setAudience('mobile-refresh')
    .sign(JWT_SECRET);
  await redis?.set(`mobile:refresh:${user.id}`, refreshToken, 'EX', REFRESH_TTL);
  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TTL,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.avatarUrl,
    },
  };
}
