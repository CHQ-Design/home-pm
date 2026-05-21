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
}

export const metadata: Metadata = {
  title: "Toft",
  description: "Personal project manager for home and family life",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Toft",
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
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6B7A5A" />
      </head>
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
