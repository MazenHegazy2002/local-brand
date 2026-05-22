import type { NextConfig } from 'next';
import withPWA from 'next-pwa';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  // ─── Turbopack Configuration ────────────────────────────────────────────────
  turbopack: {},

  // ─── Standalone output for smaller Docker images ────────────────────────────
  output: 'standalone',

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
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: '*.amazonaws.com' },
    ],
  },

  // ─── Production Hardening ────────────────────────────────────────────────
  poweredByHeader: false, // Remove "X-Powered-By: Next.js" header (security)
  compress: true, // Enable gzip compression
  reactStrictMode: true,

  // ─── Security Headers ─────────────────────────────────────────────────────
  // NOTE: Content-Security-Policy is set in `src/proxy.ts` with a per-request
  // nonce so Next.js can auto-nonce its streaming SSR inline scripts.
  // Setting a strict CSP here (without 'unsafe-inline' or a nonce) breaks
  // React/Next.js streaming — the `$RS`/`$RC` scripts get blocked and the
  // loading.tsx placeholder never gets replaced with the real page.
  async headers() {
    return [
      // ── CDN caching for hashed static assets ──────────────────────────────
      {
        source: '/_next/static/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/static/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      // ── Security headers on all routes ────────────────────────────────────
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

const pwaWrapped = pwaConfig(nextConfig);

// Wrap with Sentry — only active when SENTRY_DSN is set in the environment.
// When the DSN is absent (local dev without config), Sentry is a no-op and
// the build proceeds exactly as before.
export default withSentryConfig(pwaWrapped, {
  // Suppress Sentry CLI output in CI unless DEBUG_SENTRY=1 is set.
  silent: !process.env.DEBUG_SENTRY,

  // Tree-shake unused Sentry features in client bundles.
  disableLogger: true,

  // Don't automatically create a Sentry release or upload source maps
  // unless SENTRY_AUTH_TOKEN is explicitly set (production deployment).
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Avoid instrumentation warnings when SENTRY_DSN is not configured.
  autoInstrumentServerFunctions: !!process.env.SENTRY_DSN,
});
