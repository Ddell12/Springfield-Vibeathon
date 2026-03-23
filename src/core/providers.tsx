"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

// Guard against missing env var during build/SSR before Convex is deployed
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://placeholder.convex.cloud";
const convex = new ConvexReactClient(convexUrl);

export function Providers({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
