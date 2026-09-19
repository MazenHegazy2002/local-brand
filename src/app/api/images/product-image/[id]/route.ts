import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return new Response('Not found', { status: 404 });
    }

    const img = await prisma.productImage.findUnique({
      where: { id },
      select: { url: true },
    });

    if (!img || !img.url) {
      return new Response('Not found', { status: 404 });
    }

    // If it's a data URL, decode and stream binary with 1-year immutable caching
    if (img.url.startsWith('data:image/')) {
      const commaIdx = img.url.indexOf(',');
      if (commaIdx === -1) {
        return new Response('Bad image data', { status: 500 });
      }

      const header = img.url.substring(5, commaIdx);
      const mime = header.split(';')[0] || 'image/jpeg';
      const base64Data = img.url.substring(commaIdx + 1);
      const buffer = Buffer.from(base64Data, 'base64');

      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': mime,
          'Content-Length': buffer.length.toString(),
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // If it's an external URL, redirect directly
    return NextResponse.redirect(img.url, 307);
  } catch (error) {
    console.error('[product-image stream error]:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
