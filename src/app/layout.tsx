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
      <body className="min-h-full flex flex-col antialiased">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
