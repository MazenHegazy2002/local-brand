import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { rateLimit } from '@/lib/rateLimit';
import { redis } from '@/lib/redis';

// ─── Maintenance-mode check ────────────────────────────────────────────────
// We can't pull `prisma` into the edge bundle without breaking the Next
// middleware runtime, so we read a cached Redis flag instead. The Settings
// API writes this flag whenever the admin saves MAINTENANCE_MODE; the cache
// has a 60s TTL, so even if a write fails to invalidate, the lag is small.
async function isInMaintenance(isAdmin: boolean): Promise<boolean> {
  // Admin override is the common case — short-circuit before hitting Redis.
  try {
    const cached = await redis.get('settings:maintenance');
    if (cached === '1') {
      const allowAdmin = (await redis.get('settings:maintenance:allowAdmin')) !== '0';
      if (isAdmin && allowAdmin) return false;
      return true;
    }
    return false;
  } catch {
    // Redis down? Fail open — better to serve traffic than block everyone.
    return false;
  }
}

// ─── Content Security Policy ────────────────────────────────────────────────
// Built per-request so Next.js can attach the nonce to its streaming SSR
// inline scripts (`$RS`, `$RC`, RSC payload chunks, etc). Without a nonce
// these inline scripts are blocked by CSP and the loading.tsx Suspense
// fallback never gets replaced with the real page.
function buildCsp(nonce: string, isDev: boolean): string {
  // `'unsafe-eval'` is only needed in dev (React uses eval for error stacks).
  const pluginScriptHosts = [
    // Google Analytics + Tag Manager
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
    'https://ssl.google-analytics.com',
    // Crisp live chat
    'https://client.crisp.chat',
    // Tawk.to live chat
    'https://embed.tawk.to',
    'https://*.tawk.to',
    // Hotjar
    'https://static.hotjar.com',
    'https://script.hotjar.com',
    // Meta (Facebook) Pixel
    'https://connect.facebook.net',
  ];

  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    isDev ? "'unsafe-eval'" : '',
    'https://js.stripe.com',
    'https://grey.paysky.io',
    'https://cube.paysky.io',
    'https://va.vercel-scripts.com',
    'https://translate.google.com',
    'https://translate.googleapis.com',
    ...pluginScriptHosts,
  ]
    .filter(Boolean)
    .join(' ');

  const connectHosts = [
    'https://api.stripe.com',
    'https://api.resend.com',
    'https://*.vercel-insights.com',
    'https://accept.paymob.com',
    'https://www.atfawry.com',
    'https://api.cloudinary.com',
    'https://*.public.blob.vercel-storage.com',
    'https://translate.googleapis.com',
    'https://www.gstatic.com',
    // Plugin telemetry endpoints
    'https://www.google-analytics.com',
    'https://*.google-analytics.com',
    'https://*.analytics.google.com',
    'https://*.googletagmanager.com',
    'https://*.crisp.chat',
    'wss://*.relay.crisp.chat',
    'https://*.tawk.to',
    'wss://*.tawk.to',
    'https://*.hotjar.com',
    'wss://*.hotjar.com',
    'https://connect.facebook.net',
    'https://*.facebook.com',
  ];

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://translate.googleapis.com https://www.gstatic.com https://client.crisp.chat https://*.tawk.to https://*.hotjar.com",
    "font-src 'self' data: https://fonts.gstatic.com https://client.crisp.chat https://*.tawk.to https://*.hotjar.com",
    "img-src 'self' data: https: blob:",
    `connect-src ${["'self'", ...connectHosts].join(' ')}`,
    'frame-src https://js.stripe.com https://grey.paysky.io https://cube.paysky.io https://accept.paymob.com https://*.tawk.to https://*.hotjar.com',
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

function attachCsp(req: NextRequest, res: NextResponse): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';
  const csp = buildCsp(nonce, isDev);

  // Next.js reads `x-nonce` from the *request* headers during SSR and
  // automatically stamps it onto its inline scripts.
  req.headers.set('x-nonce', nonce);
  res.headers.set('x-nonce', nonce);
  res.headers.set('Content-Security-Policy', csp);
  return res;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Rate Limiting for API routes
  if (pathname.startsWith('/api') && !pathname.startsWith('/api/auth/session')) {
    const result = await rateLimit(req);
    if (result.limited) {
      return NextResponse.json(
        { message: 'Too many requests' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '60', // Simplified for now, or get from config
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.reset.toString(),
          },
        }
      );
    }
  }

  // Allow public routes (but still let Next.js serve them normally)
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next();
  }

  // Get session token
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // ── Maintenance mode gate ──────────────────────────────────────────────
  // When MAINTENANCE_MODE is on, everyone except admins (and the admin-os
  // surface itself) gets redirected to /maintenance. Admin login still
  // works so the operator can flip the switch back off.
  if (
    !pathname.startsWith('/admin-os') &&
    !pathname.startsWith('/api/admin') &&
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/maintenance')
  ) {
    const role = (token?.role as string | undefined) ?? 'BUYER';
    if (await isInMaintenance(role === 'ADMIN')) {
      return NextResponse.redirect(new URL('/maintenance', req.url));
    }
  }

  // Define role-based route protection
  const adminRoutes = pathname.startsWith('/admin') || pathname.startsWith('/admin-os');
  const sellerRoutes = pathname.startsWith('/seller') || pathname === '/seller-hub';
  const dashboardRoutes = pathname.startsWith('/dashboard');

  // If no user is logged in, redirect to login (except for public shop pages)
  if (!token) {
    if (adminRoutes || sellerRoutes || dashboardRoutes) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return attachCsp(req, NextResponse.next({ request: { headers: req.headers } }));
  }

  // Get user role from token
  const role = token.role || 'BUYER';

  // Admin Routes Protection
  if (adminRoutes && role !== 'ADMIN') {
    // Redirect non-admins away from admin panel
    if (role === 'SELLER') {
      return NextResponse.redirect(new URL('/seller-hub', req.url));
    }
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Seller Routes Protection (SellerHub, /sell, /seller/*)
  if (sellerRoutes && role !== 'SELLER' && role !== 'ADMIN') {
    // If trying to access seller area as buyer, go to customer dashboard
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Customer Dashboard Protection (Block Buyers from Seller areas)
  if ((sellerRoutes || adminRoutes) && role === 'BUYER') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return attachCsp(req, NextResponse.next({ request: { headers: req.headers } }));
}

export { proxy as middleware };

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
};
