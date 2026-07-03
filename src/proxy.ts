import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { rateLimit } from '@/lib/rateLimit';
import { redis } from '@/lib/redis';
import {
  CSRF_COOKIE,
  CSRF_HEADER,
  generateCsrfToken,
  validateCsrfTokens,
  isCsrfExempt,
} from '@/lib/csrf';

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
    // Hotjar
    'https://static.hotjar.com',
    'https://script.hotjar.com',
    // Meta (Facebook) Pixel
    'https://connect.facebook.net',
    // TikTok Pixel
    'https://analytics.tiktok.com',
    // Snapchat Pixel
    'https://tr.snapchat.com',
    // Microsoft Clarity
    'https://www.clarity.ms',
    // Yandex Metrica
    'https://mc.yandex.ru',
    // Pinterest Tag
    'https://s.pinimg.com',
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
    'https://*.hotjar.com',
    'wss://*.hotjar.com',
    'https://connect.facebook.net',
    'https://*.facebook.com',
    // Additional marketing pixels
    'https://*.tiktok.com',
    'https://*.snapchat.com',
    'https://*.clarity.ms',
    'https://*.yandex.ru',
    'https://*.pinterest.com',
  ];

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://translate.googleapis.com https://www.gstatic.com https://client.crisp.chat https://*.hotjar.com",
    "font-src 'self' data: https://fonts.gstatic.com https://client.crisp.chat https://*.hotjar.com",
    "img-src 'self' data: https: blob:",
    `connect-src ${["'self'", ...connectHosts].join(' ')}`,
    'frame-src https://js.stripe.com https://grey.paysky.io https://cube.paysky.io https://accept.paymob.com https://*.hotjar.com',
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

function attachCsp(
  req: NextRequest,
  res: NextResponse,
  csrfToken?: string,
  isNewCsrf?: boolean
): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';
  const csp = buildCsp(nonce, isDev);

  // Next.js reads `x-nonce` from the *request* headers during SSR and
  // automatically stamps it onto its inline scripts.
  req.headers.set('x-nonce', nonce);
  res.headers.set('x-nonce', nonce);
  res.headers.set('Content-Security-Policy', csp);

  // Issue the CSRF token cookie if the browser doesn't have one yet.
  if (isNewCsrf && csrfToken) {
    res.cookies.set(CSRF_COOKIE, csrfToken, {
      httpOnly: false,
      sameSite: 'lax',
      secure: !isDev,
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    });
  } else if (!req.cookies?.get(CSRF_COOKIE)?.value) {
    const token = generateCsrfToken();
    res.cookies.set(CSRF_COOKIE, token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: !isDev,
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    });
  }

  return res;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = (req.method ?? 'GET').toUpperCase();

  // Detect Arabic subpath
  const isArabic = pathname === '/ar' || pathname.startsWith('/ar/');
  const targetPathname = isArabic ? (pathname === '/ar' ? '/' : pathname.substring(3)) : pathname;

  // Issue the CSRF token cookie if the browser doesn't have one yet.
  // Set it on request headers as well so server components can read it via cookies().
  let csrfToken = req.cookies?.get(CSRF_COOKIE)?.value;
  let isNewCsrf = false;
  if (
    !csrfToken &&
    !targetPathname.startsWith('/api/auth') &&
    !targetPathname.startsWith('/_next') &&
    !targetPathname.includes('.')
  ) {
    csrfToken = generateCsrfToken();
    req.headers.set('cookie', `${req.headers.get('cookie') || ''}; ${CSRF_COOKIE}=${csrfToken}`);
    isNewCsrf = true;
  }

  // 1. Rate Limiting for API routes
  if (targetPathname.startsWith('/api') && !targetPathname.startsWith('/api/auth/session')) {
    const result = await rateLimit(req);
    if (result.limited) {
      return NextResponse.json(
        { message: 'Too many requests' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.reset.toString(),
          },
        }
      );
    }
  }

  // 2. CSRF enforcement — POST/PATCH/PUT/DELETE on our own API routes.
  //    Webhook callbacks are exempt (they arrive from external servers).
  //    Skipped in development so curl / Postman still works locally.
  const isProd = process.env.NODE_ENV === 'production';
  if (
    isProd &&
    targetPathname.startsWith('/api') &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) &&
    !isCsrfExempt(targetPathname)
  ) {
    const cookieToken = req.cookies?.get(CSRF_COOKIE)?.value ?? '';
    const headerToken = req.headers?.get(CSRF_HEADER) ?? '';
    if (!validateCsrfTokens(cookieToken, headerToken)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }
  }

  // Allow public routes (but still let Next.js serve them normally)
  if (
    targetPathname.startsWith('/api/auth') ||
    targetPathname.startsWith('/_next') ||
    targetPathname.startsWith('/static') ||
    targetPathname.includes('.') // static files
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
    !targetPathname.startsWith('/admin-os') &&
    !targetPathname.startsWith('/api/admin') &&
    !targetPathname.startsWith('/login') &&
    !targetPathname.startsWith('/maintenance')
  ) {
    const role = (token?.role as string | undefined) ?? 'BUYER';
    if (await isInMaintenance(role === 'ADMIN')) {
      return NextResponse.redirect(new URL(isArabic ? '/ar/maintenance' : '/maintenance', req.url));
    }
  }

  // Define role-based route protection
  const isAdminApi = targetPathname.startsWith('/api/admin');
  const adminRoutes =
    targetPathname.startsWith('/admin') || targetPathname.startsWith('/admin-os') || isAdminApi;
  const sellerRoutes = targetPathname.startsWith('/seller') || targetPathname === '/seller-hub';
  const dashboardRoutes = targetPathname.startsWith('/dashboard');

  // If no user is logged in, redirect to login (except for public shop pages)
  if (!token) {
    if (adminRoutes || sellerRoutes || dashboardRoutes) {
      if (targetPathname.startsWith('/api/')) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
      const loginUrl = new URL(isArabic ? '/ar/login' : '/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Set language header
    req.headers.set('x-lang', isArabic ? 'ar' : 'en');

    const response = isArabic
      ? NextResponse.rewrite(new URL(targetPathname + req.nextUrl.search, req.url), {
          request: { headers: req.headers },
        })
      : NextResponse.next({
          request: { headers: req.headers },
        });

    if (isArabic) {
      response.cookies.set('googtrans', '/en/ar', { path: '/' });
    } else {
      response.cookies.set('googtrans', '/en/en', { path: '/' });
    }

    return attachCsp(req, response, csrfToken, isNewCsrf);
  }

  // Get user role from token
  const role = token.role || 'BUYER';

  // Admin Routes Protection
  if (adminRoutes && role !== 'ADMIN') {
    if (targetPathname.startsWith('/api/')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    // Redirect non-admins away from admin panel
    if (role === 'SELLER') {
      return NextResponse.redirect(new URL(isArabic ? '/ar/seller-hub' : '/seller-hub', req.url));
    }
    return NextResponse.redirect(new URL(isArabic ? '/ar/dashboard' : '/dashboard', req.url));
  }

  // Seller Routes Protection (SellerHub, /sell, /seller/*)
  if (sellerRoutes && role !== 'SELLER' && role !== 'ADMIN') {
    // If trying to access seller area as buyer, go to customer dashboard
    return NextResponse.redirect(new URL(isArabic ? '/ar/dashboard' : '/dashboard', req.url));
  }

  // Customer Dashboard Protection (Block Buyers from Seller areas)
  if ((sellerRoutes || adminRoutes) && role === 'BUYER') {
    return NextResponse.redirect(new URL(isArabic ? '/ar/dashboard' : '/dashboard', req.url));
  }

  // Set language header
  req.headers.set('x-lang', isArabic ? 'ar' : 'en');

  const response = isArabic
    ? NextResponse.rewrite(new URL(targetPathname + req.nextUrl.search, req.url), {
        request: { headers: req.headers },
      })
    : NextResponse.next({
        request: { headers: req.headers },
      });

  if (isArabic) {
    response.cookies.set('googtrans', '/en/ar', { path: '/' });
  } else {
    response.cookies.set('googtrans', '/en/en', { path: '/' });
  }

  return attachCsp(req, response, csrfToken, isNewCsrf);
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
