"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ThemeProvider } from "next-themes";
import { ReactNode, useMemo } from "react";

// NEXT_PUBLIC_ vars are inlined at build time by Next.js, so this is safe
// to read at module level on both server and client.
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

export function Providers({ children }: { children: ReactNode }) {
  // Create client once per component lifetime. useMemo (not useState+useEffect)
  // ensures the ConvexProvider wraps children on the very first client render,
  // which is required by hooks like useMutation/useQuery in child components.
  const convex = useMemo(() => new ConvexReactClient(CONVEX_URL), []);

  return (
    <ConvexProvider client={convex}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        {children}
      </ThemeProvider>
    </ConvexProvider>
  );
}
