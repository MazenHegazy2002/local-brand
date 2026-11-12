import { prisma } from '@/lib/prisma';

// Google has already verified this email address, so the account counts as
// verified. OAuth-only accounts have an empty passwordHash: password sign-in
// (web and app) refuses them until the user sets a password.
export async function findOrCreateGoogleUser(input: {
  email: string;
  name?: string | null;
  image?: string | null;
}) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  });
  if (existing) {
    if (existing.deletedAt) return null;
    if (existing.emailVerified) return existing;
    return prisma.user.update({ where: { id: existing.id }, data: { emailVerified: new Date() } });
  }
  return prisma.user.create({
    data: {
      email,
      name: (input.name || email.split('@')[0]).slice(0, 100),
      passwordHash: '',
      avatarUrl: input.image || null,
      emailVerified: new Date(),
    },
  });
}
