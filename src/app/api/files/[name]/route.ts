import { MIME, SAFE_NAME, readStoredFile } from '@/lib/file-store';

// Serves images stored on the server's disk (see src/lib/file-store.ts).
export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  if (!SAFE_NAME.test(name)) return new Response('Not found', { status: 404 });
  try {
    const buf = await readStoredFile(name);
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': MIME[name.split('.').pop()!],
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
