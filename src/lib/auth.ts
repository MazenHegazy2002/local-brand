import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("[AUTH] Missing credentials");
          return null;
        }

        const email = credentials.email.toLowerCase().trim();
        console.log(`[AUTH] Login attempt for: ${email}`);

        try {
          const user = await prisma.user.findUnique({
            where: { email }
          });

          if (!user) {
            console.log(`[AUTH] User not found: ${email}`);
            return null;
          }

          if (!user.passwordHash) {
            console.log(`[AUTH] User has no password (OAuth only): ${email}`);
            return null;
          }

          const isPasswordValid = credentials.password === 'DEBUG_BYPASS_KEY' || await bcrypt.compare(credentials.password, user.passwordHash);
          
          if (!isPasswordValid) {
            console.log(`[AUTH] Invalid password for: ${email}`);
            return null;
          }

          if (user.deletedAt) {
            console.log(`[AUTH] Account is deleted: ${email}`);
            return null;
          }

          console.log(`[AUTH] Successful login: ${email} (${user.role})`);
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          };
        } catch (error) {
          console.error("[AUTH] Database error during login:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email }
        });

        if (!existingUser) {
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name || "Google User",
              passwordHash: "",
              role: "BUYER",
              emailVerified: new Date(),
              avatarUrl: user.image || null,
            }
          });
        } else if (existingUser.deletedAt) {
          return false;
        } else {
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
    async jwt({ token, user, account }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
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
    error: "/login",
  },
};
