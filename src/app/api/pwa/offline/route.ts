import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Offline page available',
    cachedRoutes: ['/', '/shop', '/categories'],
  });
}