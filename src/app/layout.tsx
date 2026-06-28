import type { Metadata, Viewport } from 'next';
import { Inter, Outfit, Cairo } from 'next/font/google';

export const dynamic = 'force-dynamic';
import './globals.css';
import AuthProvider from '@/providers/SessionProvider';
import { cookies } from 'next/headers';
import GoogleTranslate from '@/components/GoogleTranslate';
import ExitIntentPopup from '@/components/ExitIntentPopup';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  display: 'swap',
});

const cairo = Cairo({
  variable: '--font-cairo',
  subsets: ['arabic', 'latin'],
  weight: ['400', '600', '700', '900'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://www.lolozozo.shop'),
  alternates: {
    canonical: './',
    languages: {
      'x-default': 'https://www.lolozozo.shop',
      'en-EG': 'https://www.lolozozo.shop',
      'ar-EG': 'https://www.lolozozo.shop?lang=ar',
    },
  },
  title: {
    default: 'Brandy — Egyptian Marketplace for Local Sellers',
    template: '%s | Brandy',
  },
  description:
    'Discover authentic Egyptian local sellers on Brandy. Shop fashion, electronics, home goods and more from verified Egyptian sellers. Fast delivery across Egypt.',
  authors: [{ name: 'Brandy' }],
  creator: 'Brandy',
  publisher: 'Brandy',
  formatDetection: { email: false, address: false, telephone: false },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Brandy',
  },
  openGraph: {
    type: 'website',
    locale: 'en_EG',
    alternateLocale: 'ar_EG',
    siteName: 'Brandy',
    title: 'Brandy — Egyptian Marketplace for Local Sellers',
    description:
      'Discover authentic Egyptian local sellers on Brandy. Shop fashion, electronics, home goods and more from verified Egyptian sellers. Fast delivery across Egypt.',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://www.lolozozo.shop',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Brandy — Egyptian Marketplace',
    description: 'Discover authentic Egyptian local sellers on Brandy.',
    images: ['/og-image.png'],
    site: '@brandyeg',
    // Set NEXT_PUBLIC_TWITTER_HANDLE in your env (e.g. "@yourbrand")
    ...(process.env.NEXT_PUBLIC_TWITTER_HANDLE
      ? { creator: process.env.NEXT_PUBLIC_TWITTER_HANDLE }
      : {}),
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION || 'google-site-verification-code' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#1e3b8a',
};

import { LanguageProvider } from '@/providers/LanguageContext';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

import BottomNavigation from '@/components/BottomNavigation';
import CookieConsent from '@/components/CookieConsent';
import WebVitalsReporter from '@/components/WebVitalsReporter';
import InstallPrompt from '@/components/InstallPrompt';
import Plugins from '@/components/Plugins';
import CsrfProvider from '@/components/CsrfProvider';
import Footer from '@/components/Footer';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const googTrans = cookieStore.get('googtrans')?.value;
  const csrfToken = cookieStore.get('csrf-token')?.value || '';

  const isArabic = googTrans ? googTrans.includes('/ar') : false;
  const dir = isArabic ? 'rtl' : 'ltr';
  const _lang = isArabic ? 'ar' : 'en';

  // Build preconnect list dynamically so only configured services are hinted.
  const preconnectHosts: string[] = ['https://images.unsplash.com', 'https://res.cloudinary.com'];
  if (process.env.SENTRY_DSN) preconnectHosts.push('https://o0.ingest.sentry.io');
  if (process.env.NEXT_PUBLIC_GA_ID)
    preconnectHosts.push('https://www.google-analytics.com', 'https://www.googletagmanager.com');
  if (process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID) preconnectHosts.push('https://client.crisp.chat');
  if (process.env.NEXT_PUBLIC_HOTJAR_ID) preconnectHosts.push('https://static.hotjar.com');

  return (
    <html lang={_lang} dir={dir}>
      <head>
        {preconnectHosts.map(href => (
          <link key={href} rel="preconnect" href={href} crossOrigin="anonymous" />
        ))}
        {/* dns-prefetch as progressive-enhancement fallback */}
        {preconnectHosts.map(href => (
          <link key={`dns-${href}`} rel="dns-prefetch" href={href} />
        ))}
        {csrfToken && <meta name="csrf-token" content={csrfToken} />}
      </head>
      <body
        className={`${inter.variable} ${outfit.variable} ${cairo.variable} ${isArabic ? 'font-cairo' : ''} bg-[hsl(var(--background))] text-[hsl(var(--foreground))] antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[hsl(var(--primary))] focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
        >
          Skip to main content
        </a>
        <LanguageProvider>
          <GoogleTranslate />
          <AuthProvider>
            {children}
            <Footer />
            <BottomNavigation />
            <CookieConsent />
            <InstallPrompt />
            <ExitIntentPopup />
          </AuthProvider>
        </LanguageProvider>
        <Plugins />
        <CsrfProvider />
        <Analytics />
        <SpeedInsights />
        <WebVitalsReporter />
      </body>
    </html>
  );
}
