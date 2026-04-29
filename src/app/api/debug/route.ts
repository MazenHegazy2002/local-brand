import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, string> = {};

  // 1. Check environment variables
  checks['DATABASE_URL'] = process.env.DATABASE_URL
    ? `SET (starts: ${process.env.DATABASE_URL.slice(0, 20)}...)`
    : 'MISSING';
  checks['NEXTAUTH_SECRET'] = process.env.NEXTAUTH_SECRET ? 'SET' : 'MISSING';
  checks['NEXTAUTH_URL'] = process.env.NEXTAUTH_URL || 'MISSING';
  checks['NODE_ENV'] = process.env.NODE_ENV || 'undefined';

  // 2. Test Prisma connection
  try {
    const { prisma } = await import('@/lib/prisma');
    const result = await prisma.$queryRaw`SELECT 1 as ok`;
    checks['prisma'] = `OK: ${JSON.stringify(result)}`;
  } catch (e: any) {
    checks['prisma'] = `ERROR: ${e?.message || String(e)}`;
  }

  // 3. Test NextAuth config
  try {
    const { authOptions } = await import('@/lib/auth');
    checks['nextauth_config'] = `OK (${authOptions.providers.length} providers)`;
  } catch (e: any) {
    checks['nextauth_config'] = `ERROR: ${e?.message || String(e)}`;
  }

  return NextResponse.json(checks, { status: 200 });
}
