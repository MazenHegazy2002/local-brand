// src/app/ref/[slug]/page.tsx
// Sets the referral cookie and redirects home
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function RefPage({ params }: Props) {
  const { slug } = await params;

  // Validate that the slug belongs to an active affiliate
  const affiliate = await prisma.affiliate.findUnique({
    where: { referralSlug: slug.toUpperCase() },
  });

  const cookieStore = await cookies();

  if (affiliate && affiliate.status === 'ACTIVE') {
    cookieStore.set('brandy_ref', slug.toUpperCase(), {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
    });
  }

  redirect('/');
}
