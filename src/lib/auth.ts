import { NextAuthOptions, DefaultSession, DefaultUser } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    id: string;
    role: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
  }
}

import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import TwitterProvider from 'next-auth/providers/twitter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { redis } from '@/lib/redis';
import { headers } from 'next/headers';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    ...(process.env.FACEBOOK_CLIENT_ID
      ? [
          FacebookProvider({
            clientId: process.env.FACEBOOK_CLIENT_ID!,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
          }),
        ]
      : []),
    ...(process.env.TWITTER_CLIENT_ID
      ? [
          TwitterProvider({
            clientId: process.env.TWITTER_CLIENT_ID!,
            clientSecret: process.env.TWITTER_CLIENT_SECRET!,
          }),
        ]
      : []),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
        captchaId: { label: 'CaptchaId', type: 'text' },
        captchaAnswer: { label: 'CaptchaAnswer', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();
        const captchaId = credentials.captchaId?.trim();
        const captchaAnswer = credentials.captchaAnswer?.trim();

        const headerList = await headers();
        const ip = headerList.get('x-forwarded-for') || 'unknown';
        const emailKey = `login:limit:email:${email}`;
        const ipKey = `login:limit:ip:${ip}`;

        // Rate-limit / lockout checks — fault-tolerant so login works even
        // when Redis is unavailable (e.g. no REDIS_URL configured).
        let emailAttempts: string | null = null;
        let ipAttempts: string | null = null;
        let redisAvailable = true;

        try {
          [emailAttempts, ipAttempts] = await Promise.all([redis.get(emailKey), redis.get(ipKey)]);
        } catch {
          redisAvailable = false;
          console.warn('[AUTH] Redis unavailable — skipping lockout checks');
        }

        let captchaVerified = false;
        if (redisAvailable && captchaId && captchaAnswer) {
          try {
            const expected = await redis.get(`captcha:${captchaId}`);
            if (expected && expected === captchaAnswer) {
              captchaVerified = true;
              await redis.del(`captcha:${captchaId}`);
            }
          } catch {
            // Redis unavailable — skip captcha check
          }
        }

        if (redisAvailable && emailAttempts && parseInt(emailAttempts) >= 5) {
          if (!captchaVerified) {
            const ttl = await redis.ttl(emailKey);
            const secs = ttl > 0 ? ttl : 300;
            throw new Error(`LOCKOUT:email:${secs}`);
          }
          // CAPTCHA verified — reset the lockout so the user can try logging in
          await Promise.all([redis.del(emailKey), redis.del(ipKey)]);
        }
        if (redisAvailable && ipAttempts && parseInt(ipAttempts) >= 20) {
          const ttl = await redis.ttl(ipKey);
          const secs = ttl > 0 ? ttl : 300;
          throw new Error(`LOCKOUT:ip:${secs}`);
        }

        try {
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user || !user.passwordHash) {
            if (redisAvailable) {
              Promise.all([
                redis.incr(emailKey).then(attempts => {
                  if (attempts === 1) redis.expire(emailKey, 300);
                }),
                redis.incr(ipKey).then(attempts => {
                  if (attempts === 1) redis.expire(ipKey, 300);
                }),
              ]).catch(() => {});
            }
            return null;
          }
          const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!isPasswordValid || user.deletedAt) {
            if (redisAvailable) {
              Promise.all([
                redis.incr(emailKey).then(attempts => {
                  if (attempts === 1) redis.expire(emailKey, 300);
                }),
                redis.incr(ipKey).then(attempts => {
                  if (attempts === 1) redis.expire(ipKey, 300);
                }),
              ]).catch(() => {});
            }
            return null;
          }

          // Enforce email verification for credentials logins
          if (!user.emailVerified) {
            throw new Error('Email not verified');
          }

          // Reset attempts on successful login
          if (redisAvailable) {
            Promise.all([redis.del(emailKey), redis.del(ipKey)]).catch(() => {});
          }

          return { id: user.id, name: user.name, email: user.email, role: user.role };
        } catch (error) {
          console.error('[AUTH] Error:', error);
          if (
            error instanceof Error &&
            (error.message === 'Email not verified' || error.message.includes('attempts'))
          ) {
            throw error;
          }
          throw new Error('Login failed');
        }
      },
    }),
    // Passwordless "magic link" flow. POST /api/auth/magic-link emails a
    // single-use token that the client posts here via
    // signIn('magic-link', { token }). We reuse the PasswordResetToken table
    // because the shape (single-use, time-bound, identified by email) is
    // identical — adding a parallel table would just be schema churn.
    CredentialsProvider({
      id: 'magic-link',
      name: 'MagicLink',
      credentials: {
        token: { label: 'Token', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.token) return null;
        const token = credentials.token.trim();
        try {
          const tokenRecord = await prisma.passwordResetToken.findUnique({ where: { token } });
          if (!tokenRecord) return null;
          if (tokenRecord.expires < new Date()) {
            // Garbage-collect expired tokens opportunistically.
            await prisma.passwordResetToken.delete({ where: { token } }).catch(() => {});
            return null;
          }
          const user = await prisma.user.findUnique({ where: { email: tokenRecord.email } });
          if (!user || user.deletedAt) return null;

          // Auto-verify email on magic-link entry since they accessed their email
          if (!user.emailVerified) {
            await prisma.user.update({
              where: { id: user.id },
              data: { emailVerified: new Date() },
            });
          }

          // Single-use: consume the token now so it can't be replayed.
          await prisma.passwordResetToken.delete({ where: { token } }).catch(() => {});
          return { id: user.id, name: user.name, email: user.email, role: user.role };
        } catch (error) {
          console.error('[AUTH] Magic link error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role;
        session.user.id = token.id;
      }
      return session;
    },
  },
  events: {
    // On every successful sign-in, link any orphan guest orders whose
    // guestEmail matches this user's email. Handles two cases:
    //  - User signed up after placing a guest order, then logs in for the
    //    first time (register also claims, but signIn covers OAuth flows too).
    //  - User had an account, placed a guest order with the same email, then
    //    logs back in — their dashboard should pick up that order.
    async signIn({ user }) {
      if (!user?.email || !user.id) return;
      try {
        await prisma.order.updateMany({
          where: { userId: null, guestEmail: user.email },
          data: { userId: user.id, guestEmail: null },
        });
      } catch (err) {
        console.error('[AUTH] Failed to claim guest orders on signIn:', err);
      }
    },
  },
  session: { strategy: 'jwt' },
  pages: { signIn: '/login', error: '/login' },
};
