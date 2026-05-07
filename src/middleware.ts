import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes
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

  // Define role-based route protection
  const adminRoutes = pathname.startsWith('/admin');
  const sellerRoutes = pathname.startsWith('/seller') || pathname.startsWith('/sell') || pathname === '/seller-hub';
  const dashboardRoutes = pathname.startsWith('/dashboard');

  // If no user is logged in, redirect to login (except for public shop pages)
  if (!token) {
    if (adminRoutes || sellerRoutes || dashboardRoutes) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
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

  return NextResponse.next();
}

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