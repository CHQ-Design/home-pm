import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import Nav from "./nav";
import AuthSessionProvider from "./session-provider";
import AutoSubscribe from "./auto-subscribe";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Board",
  description: "Personal project manager for home and family life",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "The Board",
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
      className={`${fraunces.variable} ${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6B7A5A" />
      </head>
      <body className="min-h-[100dvh] flex flex-col overflow-x-hidden">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-[#3A3228] focus:rounded-md focus:shadow-md">
          Skip to main content
        </a>
        <AuthSessionProvider>
          <AutoSubscribe />
          <Nav />
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  );
}
