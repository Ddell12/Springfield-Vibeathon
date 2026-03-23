"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useEffect, useState } from "react";

export function Providers({ children }: { children: ReactNode }) {
  // Defer Convex client creation to the browser to avoid "not an absolute URL"
  // errors during static prerendering when NEXT_PUBLIC_CONVEX_URL is not set.
  const [convex, setConvex] = useState<ConvexReactClient | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (url) {
      setConvex(new ConvexReactClient(url));
    }
  }, []);

  if (!convex) {
    return <>{children}</>;
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
