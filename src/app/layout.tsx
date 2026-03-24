import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/core/providers";
import { Toaster } from "@/shared/components/ui/sonner";

export const metadata: Metadata = {
  title: "Bridges — AI Therapy Tool Builder",
  description: "Build interactive therapy tools with AI. Designed for ABA therapists, speech therapists, and parents of autistic children.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col antialiased">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
