import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Must be ADMIN to access /admin-os
    if (path.startsWith("/admin-os") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Must be SELLER (or ADMIN) to access /seller-hub
    if (path.startsWith("/seller-hub")) {
      if (token?.role !== "SELLER" && token?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    // Must be logged in to access /dashboard
    if (path.startsWith("/dashboard") && !token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/admin-os/:path*", "/seller-hub/:path*", "/dashboard/:path*"],
};
