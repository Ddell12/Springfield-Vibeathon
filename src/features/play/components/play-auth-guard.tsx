"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface PlayAuthGuardProps {
  patientId: string;
  children: React.ReactNode;
}

export function PlayAuthGuard({ patientId, children }: PlayAuthGuardProps) {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const returnUrl = encodeURIComponent(window.location.pathname);
      router.replace(`/sign-in?redirect_url=${returnUrl}`);
    }
  }, [authLoading, isAuthenticated, router]);

  const patient = useQuery(
    api.patients.getForPlay,
    isAuthenticated ? { patientId: patientId as Id<"patients"> } : "skip"
  );

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (patient === undefined) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (patient === null) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <div className="text-4xl">🔒</div>
        <h1 className="text-xl font-semibold text-foreground font-[family-name:var(--font-manrope)]">
          No access
        </h1>
        <p className="max-w-sm text-muted-foreground">
          Ask your therapist to send you an invite to access this child&apos;s activities.
        </p>
        <Link
          href="/family"
          className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Go to Family Home
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
