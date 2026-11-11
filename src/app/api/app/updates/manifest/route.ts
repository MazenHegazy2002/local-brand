// GET /api/app/updates/manifest — expo-updates checks here on every app start.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildManifest, multipart } from '@/lib/app-updates';
import { PLATFORM_URL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const HEADERS = {
  'expo-protocol-version': '1',
  'expo-sfv-version': '0',
  'cache-control': 'private, max-age=0',
};

export async function GET(req: NextRequest) {
  const h = req.headers;
  const q = req.nextUrl.searchParams;
  const platform = (h.get('expo-platform') ?? q.get('platform')) as 'android' | 'ios' | null;
  const runtimeVersion = h.get('expo-runtime-version') ?? q.get('runtime-version');
  if ((platform !== 'android' && platform !== 'ios') || !runtimeVersion)
    return NextResponse.json({ error: 'Missing platform or runtime version' }, { status: 400 });
  const current = h.get('expo-current-update-id');
  const embedded = h.get('expo-embedded-update-id');

  const latest = await prisma.appUpdate.findFirst({
    where: { runtimeVersion, active: true, platforms: { contains: platform } },
    orderBy: { createdAt: 'desc' },
  });

  let part: ReturnType<typeof multipart>;
  if (!latest) {
    // Nothing published (or everything rolled back): go back to the version
    // built into the store app, unless the phone is already running it.
    part =
      current && current !== embedded
        ? multipart('directive', {
            type: 'rollBackToEmbedded',
            parameters: { commitTime: new Date().toISOString() },
          })
        : multipart('directive', { type: 'noUpdateAvailable' });
  } else if (current === latest.id) {
    part = multipart('directive', { type: 'noUpdateAvailable' });
  } else {
    const manifest = await buildManifest(latest, platform, PLATFORM_URL);
    part = manifest
      ? multipart('manifest', manifest)
      : multipart('directive', { type: 'noUpdateAvailable' });
  }
  return new NextResponse(part.body, {
    status: 200,
    headers: { ...HEADERS, 'content-type': part.contentType },
  });
}
