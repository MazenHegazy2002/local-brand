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
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();

        try {
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user || !user.passwordHash) return null;
          const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!isPasswordValid || user.deletedAt) return null;

          // Enforce email verification for credentials logins
          if (!user.emailVerified) {
            throw new Error('Email not verified');
          }

          return { id: user.id, name: user.name, email: user.email, role: user.role };
        } catch (error) {
          console.error('[AUTH] Error:', error);
          throw error; // Re-throw so NextAuth passes the error string to the client
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
