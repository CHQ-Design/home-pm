import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import Nav from "./nav";
import AuthSessionProvider from "./session-provider";
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
      className={`${fraunces.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-180.png" />
        <meta name="theme-color" content="#6B7A5A" />
      </head>
      <body className="min-h-[100dvh] flex flex-col">
        <AuthSessionProvider>
          <Nav />
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  );
}
