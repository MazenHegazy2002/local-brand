// GET /api/app/updates/assets?id=&path= — files of a published app update.
import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { mimeFor, updateFile } from '@/lib/app-updates';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const rel = q.get('path') ?? '';
  const file = updateFile(q.get('id') ?? '', rel);
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    const buf = await readFile(file);
    const isBundle = rel.includes('_expo/static/js/');
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'content-type': isBundle ? 'application/javascript' : mimeFor(rel.split('.').pop() ?? ''),
        // Update files never change once published.
        'cache-control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
