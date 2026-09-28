import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { dataUrlToFile } from '@/lib/file-store';

// Moves legacy base64 logos/avatars/banners onto disk. Idempotent: only rows
// still holding a data: URL are touched. Called by the deploy workflow.
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const data = { startsWith: 'data:' };

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let moved = 0;
  const conv = async (v: string | null) => {
    const saved = v ? await dataUrlToFile(v) : null;
    if (saved) moved++;
    return saved ?? undefined;
  };

  for (const r of await prisma.user.findMany({
    where: { avatarUrl: data },
    select: { id: true, avatarUrl: true },
  }))
    await prisma.user.update({ where: { id: r.id }, data: { avatarUrl: await conv(r.avatarUrl) } });
  for (const r of await prisma.sellerProfile.findMany({
    where: { logoUrl: data },
    select: { id: true, logoUrl: true },
  }))
    await prisma.sellerProfile.update({
      where: { id: r.id },
      data: { logoUrl: await conv(r.logoUrl) },
    });
  for (const r of await prisma.brand.findMany({
    where: { OR: [{ logoUrl: data }, { coverUrl: data }] },
    select: { id: true, logoUrl: true, coverUrl: true },
  }))
    await prisma.brand.update({
      where: { id: r.id },
      data: { logoUrl: await conv(r.logoUrl), coverUrl: await conv(r.coverUrl) },
    });
  for (const r of await prisma.collection.findMany({
    where: { imageUrl: data },
    select: { id: true, imageUrl: true },
  }))
    await prisma.collection.update({
      where: { id: r.id },
      data: { imageUrl: await conv(r.imageUrl) },
    });
  for (const r of await prisma.homepageBanner.findMany({
    where: { imageUrl: data },
    select: { id: true, imageUrl: true },
  }))
    await prisma.homepageBanner.update({
      where: { id: r.id },
      data: { imageUrl: await conv(r.imageUrl) },
    });
  for (const r of await prisma.productImage.findMany({
    where: { url: data },
    select: { id: true, url: true },
  }))
    await prisma.productImage.update({ where: { id: r.id }, data: { url: await conv(r.url) } });

  return NextResponse.json({ moved });
}
