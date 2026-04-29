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

// Arabic font — activated when locale = ar
const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700", "900"],
});

export const metadata: Metadata = {
  title: "Local Brand | Premium Marketplace",
  description: "Discover and support high-end local Egyptian brands. Authentic, quality, and curated.",
  keywords: ["marketplace", "local brands", "egypt", "fashion", "electronics", "authentic"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LocalBrand",
  },
  openGraph: {
    title: "Local Brand Marketplace",
    description: "The premier destination for authentic Egyptian brands and premium local products.",
    url: "https://localbrand-egypt.com",
    siteName: "LocalBrand",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Local Brand Marketplace",
    description: "Support high-end local Egyptian artisans.",
  },
  robots: {
    index: true,
    follow: true,
  }
};

import { LanguageProvider } from "@/providers/LanguageContext";

import BottomNavigation from '@/components/BottomNavigation';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const googTrans = cookieStore.get('googtrans')?.value;
  
  const isArabic = googTrans ? googTrans.includes('/ar') : false;
  const dir = isArabic ? 'rtl' : 'ltr';

  return (
    <html lang="en" dir={dir}>
      <body className={`${inter.variable} ${outfit.variable} ${cairo.variable} bg-[hsl(var(--background))] text-[hsl(var(--foreground))] antialiased`}>
        <LanguageProvider>
          <GoogleTranslate />
          <AuthProvider>
            {children}
            <BottomNavigation />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
