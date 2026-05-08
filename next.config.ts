import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  // ─── Turbopack Configuration ────────────────────────────────────────────────
  turbopack: {},

  // ─── Server External Packages ───────────────────────────────────────────────
  serverExternalPackages: ['@prisma/client', '@neondatabase/serverless', 'ws', 'pg'],

  // ─── Body Size Limit (Next.js 16: lives under `experimental`) ──────────────
  experimental: {
    proxyClientMaxBodySize: '10mb', // for image uploads
  },

  // ─── Image Optimisation ───────────────────────────────────────────────────
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "*.amazonaws.com" },
    ],
  },

  // ─── Production Hardening ────────────────────────────────────────────────
  poweredByHeader: false, // Remove "X-Powered-By: Next.js" header (security)
  compress: true,          // Enable gzip compression
  reactStrictMode: true,

  // ─── Security Headers ─────────────────────────────────────────────────────
  // NOTE: Content-Security-Policy is set in `src/proxy.ts` with a per-request
  // nonce so Next.js can auto-nonce its streaming SSR inline scripts.
  // Setting a strict CSP here (without 'unsafe-inline' or a nonce) breaks
  // React/Next.js streaming — the `$RS`/`$RC` scripts get blocked and the
  // loading.tsx placeholder never gets replaced with the real page.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },

  // ─── Redirects ────────────────────────────────────────────────────────────
  async redirects() {
    return [
      { source: '/store', destination: '/shop', permanent: true },
      { source: '/products', destination: '/shop', permanent: true },
    ];
  },
};

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60,
        },
      },
    },
  ],
});

export default pwaConfig(nextConfig);
