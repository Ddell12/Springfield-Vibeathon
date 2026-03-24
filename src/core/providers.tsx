"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ThemeProvider } from "next-themes";
import { type ReactNode, useMemo } from "react";

export function Providers({ children }: { children: ReactNode }) {
  // Guard against missing URL during Next.js SSR/prerender (no Convex URL in build env).
  // useMemo runs during SSR for "use client" components when Next.js prerenders pages.
  const convex = useMemo(
    () =>
      new ConvexReactClient(
        process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://placeholder.convex.cloud"
      ),
    []
  );

  return (
    <ConvexProvider client={convex}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        {children}
      </ThemeProvider>
    </ConvexProvider>
  );
}
