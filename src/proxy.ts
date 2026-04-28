import { NextResponse } from 'next/server';

export async function middleware(req: any) {
  // Skip for non-API routes
  if (!req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Rate limiting disabled due to ioredis Edge Runtime incompatibility
  // const rateLimitResult = await rateLimit(req);
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
