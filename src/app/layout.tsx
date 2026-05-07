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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://localbrand-egypt.com"),
  title: {
    default: "Local Brand — Egyptian Marketplace for Local Brands",
    template: "%s | Local Brand",
  },
  description: "Discover authentic Egyptian local brands. Shop fashion, electronics, home goods and more from verified Egyptian sellers. Fast delivery across Egypt.",
  keywords: ["Egyptian brands", "local brands Egypt", "Egyptian marketplace", "buy Egyptian products", "Egyptian fashion", "Egyptian crafts"],
  authors: [{ name: "Local Brand" }],
  creator: "Local Brand",
  publisher: "Local Brand",
  formatDetection: { email: false, address: false, telephone: false },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LocalBrand",
  },
  openGraph: {
    type: "website",
    locale: "en_EG",
    alternateLocale: "ar_EG",
    siteName: "Local Brand",
    title: "Local Brand — Egyptian Marketplace for Local Brands",
    description: "Discover authentic Egyptian local brands. Shop from verified sellers across Egypt.",
    url: "https://localbrand-egypt.com",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Local Brand — Egyptian Marketplace",
    description: "Discover authentic Egyptian local brands.",
    images: ["/og-image.png"],
    creator: "@localbrand",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
  verification: { google: "google-site-verification-code" },
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
