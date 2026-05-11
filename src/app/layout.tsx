import type { Metadata } from "next";
import { Inter, Outfit, Cairo } from "next/font/google";

export const dynamic = 'force-dynamic';
import "./globals.css";
import AuthProvider from "@/providers/SessionProvider";
import { cookies } from "next/headers";
import GoogleTranslate from "@/components/GoogleTranslate";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://brandy-egypt.com"),
  title: {
    default: "Brandy — Egyptian Marketplace for Local Sellers",
    template: "%s | Brandy",
  },
  description: "Discover authentic Egyptian local sellers on Brandy. Shop fashion, electronics, home goods and more from verified Egyptian sellers. Fast delivery across Egypt.",
  keywords: ["Brandy", "Egyptian brands", "local sellers Egypt", "Egyptian marketplace", "buy Egyptian products", "Egyptian fashion", "Egyptian crafts"],
  authors: [{ name: "Brandy" }],
  creator: "Brandy",
  publisher: "Brandy",
  formatDetection: { email: false, address: false, telephone: false },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Brandy",
  },
  openGraph: {
    type: "website",
    locale: "en_EG",
    alternateLocale: "ar_EG",
    siteName: "Brandy",
    title: "Brandy — Egyptian Marketplace for Local Sellers",
    description: "Discover authentic Egyptian local sellers on Brandy. Shop from verified sellers across Egypt.",
    url: "https://brandy-egypt.com",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Brandy — Egyptian Marketplace",
    description: "Discover authentic Egyptian local sellers on Brandy.",
    images: ["/og-image.png"],
    creator: "@brandy",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
  verification: { google: "google-site-verification-code" },
};

import { LanguageProvider } from "@/providers/LanguageContext";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

import BottomNavigation from '@/components/BottomNavigation';
import CookieConsent from '@/components/CookieConsent';
import WebVitalsReporter from '@/components/WebVitalsReporter';
import InstallPrompt from '@/components/InstallPrompt';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const googTrans = cookieStore.get('googtrans')?.value;

  const isArabic = googTrans ? googTrans.includes('/ar') : false;
  const dir = isArabic ? 'rtl' : 'ltr';
  const lang = isArabic ? 'ar' : 'en';

  return (
    <html lang={lang} dir={dir}>
      <body className={`${inter.variable} ${outfit.variable} ${cairo.variable} ${isArabic ? 'font-cairo' : ''} bg-[hsl(var(--background))] text-[hsl(var(--foreground))] antialiased`}>
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
            <BottomNavigation />
            <CookieConsent />
            <InstallPrompt />
          </AuthProvider>
        </LanguageProvider>
        <Analytics />
        <SpeedInsights />
        <WebVitalsReporter />
      </body>
    </html>
  );
}
