import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';

export async function middleware(req: any) {
  // Skip for non-API routes
  if (!req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Apply rate limiting
  const rateLimitResult = await rateLimit(req);
  
  if (rateLimitResult.limited) {
    return new NextResponse(
      JSON.stringify({ 
        error: 'Too many requests', 
        retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000) 
      }),
      { 
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000)),
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        }
      }
    );
  }

  const res = NextResponse.next();
  res.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
  res.headers.set('X-RateLimit-Reset', String(rateLimitResult.reset));
  
  return res;
}

export const config = {
  matcher: '/api/:path*',
};
