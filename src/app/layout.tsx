import type { Metadata, Viewport } from 'next';
import { Inter, Outfit, Cairo } from 'next/font/google';

import './globals.css';
import AuthProvider from '@/providers/SessionProvider';
import { cookies, headers } from 'next/headers';
import GoogleTranslate from '@/components/GoogleTranslate';
import ExitIntentPopup from '@/components/ExitIntentPopup';
import BuyerAnnouncementPopup from '@/components/BuyerAnnouncementPopup';

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://brandyy.shop'),
  alternates: {
    canonical: './',
    languages: {
      'x-default': 'https://brandyy.shop',
      'en-EG': 'https://brandyy.shop',
      'ar-EG': 'https://brandyy.shop?lang=ar',
      en: 'https://brandyy.shop',
      ar: 'https://brandyy.shop?lang=ar',
    },
  },
  title: {
    default: 'Brandy — Egyptian Marketplace for Local Sellers',
    template: '%s | Brandy',
  },
  description:
    'Discover authentic Egyptian local sellers on Brandy. Shop fashion, electronics, home goods, watches and more from verified Egyptian sellers. Fast delivery across Egypt with 14-day escrow protection.',
  keywords: [
    'Egyptian local brands',
    'Made in Egypt',
    'Brandy Egypt',
    'Brandy marketplace',
    'براندات مصرية',
    'تسوق اونلاين مصر',
    'ماركات محلية مصرية',
    'ساعات يد مصرية',
    'ملابس براندات محلية',
    'احذية وحقائب محلية',
    'سوق مصري',
    'الدفع عند الاستلام مصر',
  ],
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
      'Discover authentic Egyptian local sellers on Brandy. Shop fashion, electronics, home goods and more from verified Egyptian sellers. Fast delivery across Egypt with 14-day escrow buyer protection.',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://brandyy.shop',
    images: [{ url: '/api/og?badge=Egyptian+Local+Marketplace', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Brandy — Egyptian Marketplace',
    description: 'Discover authentic Egyptian local sellers on Brandy. Fast delivery across Egypt.',
    images: ['/api/og?badge=Egyptian+Local+Marketplace'],
    site: '@brandyeg',
    ...(process.env.NEXT_PUBLIC_TWITTER_HANDLE
      ? { creator: process.env.NEXT_PUBLIC_TWITTER_HANDLE }
      : {}),
  },
  other: {
    'geo.region': 'EG',
    'geo.placename': 'Cairo, Egypt',
    'geo.position': '30.0444;31.2357',
    ICBM: '30.0444, 31.2357',
    target_country: 'EG',
    coverage: 'Egypt',
    distribution: 'Global',
    rating: 'General',
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
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || [
      'CzhozJrBH1O0lyqPpK-3mT5ft3bxZ6MxyRHyPRzPetI',
      'google7e253040c3638fad',
    ],
    other: {
      'facebook-domain-verification':
        process.env.FACEBOOK_DOMAIN_VERIFICATION || 'facebook-domain-verification-code',
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#1e3b8a',
};

import { LanguageProvider } from '@/providers/LanguageContext';
import { ConfirmProvider } from '@/providers/ConfirmProvider';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

import BottomNavigation from '@/components/BottomNavigation';
import CookieConsent from '@/components/CookieConsent';
import WebVitalsReporter from '@/components/WebVitalsReporter';
import VisitorTracker from '@/components/VisitorTracker';
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

  const headersList = await headers();
  const xLang = headersList.get('x-lang');
  const isArabic = (googTrans ? googTrans.includes('/ar') : false) || xLang === 'ar';
  const dir = isArabic ? 'rtl' : 'ltr';
  const _lang = isArabic ? 'ar' : 'en';

  // Build preconnect list dynamically so only configured services are hinted.
  // Image CDNs are always preconnected because they serve the LCP hero image.
  const preconnectHosts: string[] = [
    'https://images.unsplash.com',
    'https://res.cloudinary.com',
    'https://lh3.googleusercontent.com',
  ];
  if (process.env.SENTRY_DSN) preconnectHosts.push('https://o0.ingest.sentry.io');
  if (process.env.NEXT_PUBLIC_GA_ID)
    preconnectHosts.push('https://www.google-analytics.com', 'https://www.googletagmanager.com');
  if (process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID) preconnectHosts.push('https://client.crisp.chat');
  if (process.env.NEXT_PUBLIC_HOTJAR_ID) preconnectHosts.push('https://static.hotjar.com');
  if (process.env.BLOB_READ_WRITE_TOKEN) preconnectHosts.push('https://blob.vercel-storage.com');

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
        <link rel="alternate" type="text/plain" href="/llms.txt" title="LLM Knowledge Base" />
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
        <LanguageProvider defaultLang={_lang}>
          <ToastProvider>
            <ConfirmProvider>
              <GoogleTranslate />
              <AuthProvider>
                <div id="main-content" tabIndex={-1} className="outline-none">
                  {children}
                </div>
                <Footer />
                <BottomNavigation />
                <CookieConsent />
                <InstallPrompt />
                <ExitIntentPopup />
                <BuyerAnnouncementPopup />
                <VisitorTracker />
              </AuthProvider>
            </ConfirmProvider>
          </ToastProvider>
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
