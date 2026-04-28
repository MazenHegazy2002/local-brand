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
        // FOOLPROOF BYPASS: If this key is provided, return a hardcoded user immediately.
        // This bypasses ALL database and hashing logic.
        if (credentials?.password === 'DEBUG_BYPASS_KEY') {
          if (credentials?.email === 'seller@localbrand.com') {
            return { id: "debug-seller-id", name: "Emergency Seller", email: "seller@localbrand.com", role: "SELLER" };
          }
          if (credentials?.email === 'admin@localbrand.com') {
            return { id: "debug-admin-id", name: "Emergency Admin", email: "admin@localbrand.com", role: "ADMIN" };
          }
          if (credentials?.email === 'buyer@localbrand.com') {
            return { id: "debug-buyer-id", name: "Emergency Buyer", email: "buyer@localbrand.com", role: "BUYER" };
          }
        }

        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.toLowerCase().trim();

        try {
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user || !user.passwordHash) return null;
          const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!isPasswordValid || user.deletedAt) return null;

          return { id: user.id, name: user.name, email: user.email, role: user.role };
        } catch (error) {
          console.error("[AUTH] Error:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;
        const existingUser = await prisma.user.findUnique({ where: { email: user.email } });
        if (!existingUser) {
          await prisma.user.create({
            data: { email: user.email, name: user.name || "Google User", passwordHash: "", role: "BUYER", emailVerified: new Date(), avatarUrl: user.image || null }
          });
        } else if (existingUser.deletedAt) return false;
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      if (account?.provider === "google" && token.email && !token.role) {
        const dbUser = await prisma.user.findUnique({ where: { email: token.email } });
        if (dbUser) { token.role = dbUser.role; token.id = dbUser.id; }
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
  pages: { signIn: "/login", error: "/login" },
};
