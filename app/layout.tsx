import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import Nav from "./nav";
import BottomNav from "./bottom-nav";
import AuthSessionProvider from "./session-provider";
import AutoSubscribe from "./auto-subscribe";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F9F5EF" },
    { media: "(prefers-color-scheme: dark)", color: "#3A3228" },
  ],
}

export const metadata: Metadata = {
  title: {
    default: "Otium — the quiet hours, attended to",
    template: "%s · Otium",
  },
  description:
    "A calm way to keep your household running. Add what needs doing. Check it off. The rest is yours.",
  applicationName: "Otium",
  authors: [{ name: "Craig Register" }],
  keywords: ["household management", "tasks", "home", "calm productivity"],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Otium",
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    title: "Otium — your household, calmly",
    description:
      "An old Latin word for productive leisure. A new app for what needs doing around your home.",
    siteName: "Otium",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Otium — the quiet hours, attended to",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Otium — your household, calmly",
    description:
      "A calm way to keep your household running. Add what needs doing. Check it off.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${jakartaSans.variable} ${geistMono.variable} antialiased`}
    >
      <head />
      <body className="min-h-[100dvh] flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-background focus:px-4 focus:py-2 focus:rounded focus:text-sm focus:font-medium focus:shadow-card"
        >
          Skip to main content
        </a>
        <AuthSessionProvider>
          <AutoSubscribe />
          <Nav />
          {children}
          <BottomNav />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
