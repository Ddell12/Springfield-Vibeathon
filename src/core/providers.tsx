"use client";

import { useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ThemeProvider } from "next-themes";
import { type ReactNode, useMemo } from "react";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convex = useMemo(
    () =>
      new ConvexReactClient(
        process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://placeholder.convex.cloud"
      ),
    []
  );

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        {children}
      </ThemeProvider>
    </ConvexProviderWithClerk>
  );
}
