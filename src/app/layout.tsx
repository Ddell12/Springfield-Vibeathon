import "./globals.css";

import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import type { Metadata } from "next";

import { APP_BRAND, APP_DESCRIPTION, APP_TAGLINE } from "@/core/config";
import { Providers } from "@/core/providers";
import { SkipToContent } from "@/shared/components/skip-to-content";
import { Toaster } from "@/shared/components/ui/sonner";

export const metadata: Metadata = {
  title: `${APP_BRAND} — ${APP_TAGLINE}`,
  description: APP_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: `${APP_BRAND} — ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
    type: "website",
    siteName: APP_BRAND,
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_BRAND} — ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      {/* eslint-disable @next/next/no-page-custom-font -- App Router layout, not Pages Router _document.js */}
      <head>
        <meta name="theme-color" content="#F6F3EE" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#1A1917" media="(prefers-color-scheme: dark)" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&family=Instrument+Sans:wght@400;500;600;700&family=Commit+Mono&display=swap"
          rel="stylesheet"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
          crossOrigin="anonymous"
        />
      </head>
      {/* eslint-enable @next/next/no-page-custom-font */}
      <body className="min-h-full flex flex-col antialiased">
        <SkipToContent />
        <ConvexAuthNextjsServerProvider>
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </ConvexAuthNextjsServerProvider>
      </body>
    </html>
  );
}
