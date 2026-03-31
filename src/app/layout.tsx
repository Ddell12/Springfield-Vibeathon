import "./globals.css";

import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";

import { ConvexClientProvider } from "@/core/providers";
import { SkipToContent } from "@/shared/components/skip-to-content";
import { Toaster } from "@/shared/components/ui/sonner";

export const metadata: Metadata = {
  title: "Bridges — AI Therapy App Builder",
  description: "Build interactive therapy apps with AI. Designed for ABA therapists, speech therapists, and parents of autistic children.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Bridges — AI Therapy App Builder",
    description: "Describe therapy tools in plain language and get working, interactive apps built by AI.",
    type: "website",
    siteName: "Bridges",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bridges — AI Therapy App Builder",
    description: "Build interactive therapy apps with AI.",
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
        <ClerkProvider signInForceRedirectUrl="/builder" signUpForceRedirectUrl="/builder">
          <ConvexClientProvider>
            {children}
            <Toaster />
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
