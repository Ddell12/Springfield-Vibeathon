import "./globals.css";

import type { Metadata } from "next";

import { Providers } from "@/core/providers";
import { SkipToContent } from "@/shared/components/skip-to-content";
import { Toaster } from "@/shared/components/ui/sonner";

export const metadata: Metadata = {
  title: "Bridges — AI Therapy App Builder",
  description: "Build interactive therapy apps with AI. Designed for ABA therapists, speech therapists, and parents of autistic children.",
  openGraph: {
    title: "Bridges — AI Therapy App Builder",
    description: "Build interactive therapy apps with AI. Designed for ABA therapists, speech therapists, and parents of autistic children.",
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
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap"
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
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
