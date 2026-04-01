import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    // ─── Google OAuth ──────────────────────────────────────────────────────
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // ─── Email / Password ─────────────────────────────────────────────────
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.passwordHash) return null;

        const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isPasswordValid) return null;

        // Block soft-deleted accounts
        if (user.deletedAt) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      }
    })
  ],

  callbacks: {
    // ─── Fires on every sign-in ───────────────────────────────────────────
    async signIn({ user, account }) {
      // Only handle Google sign-ins (credentials are handled in authorize above)
      if (account?.provider === "google") {
        if (!user.email) return false;

        // Find or create the user in our DB
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email }
        });

        if (!existingUser) {
          // New user via Google — create as BUYER by default
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name || "Google User",
              passwordHash: "", // No password for OAuth users
              role: "BUYER",
              emailVerified: new Date(), // Google already verified the email
              avatarUrl: user.image || null,
            }
          });
        } else if (existingUser.deletedAt) {
          // Block deleted accounts from logging in via Google
          return false;
        } else {
          // Update avatar from Google if not already set
          if (!existingUser.avatarUrl && user.image) {
            await prisma.user.update({
              where: { email: user.email },
              data: { avatarUrl: user.image, emailVerified: new Date() }
            });
          }
        }
      }
      return true;
    },

    // ─── Attach role + id to JWT token ────────────────────────────────────
    async jwt({ token, user, account }) {
      if (user) {
        // For credentials sign-in: user object has role injected by authorize()
        token.role = (user as any).role;
        token.id = user.id;
      }

      // For Google sign-ins after first auth: fetch role from DB using email
      if (account?.provider === "google" && token.email && !token.role) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email }
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.id = dbUser.id;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session?.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    }
  },

  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login", // Redirect auth errors back to login with ?error=
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
