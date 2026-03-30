"use client";

import { use } from "react";
import { useQuery, useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { FullscreenAppView } from "@/shared/components/fullscreen-app-view";
import { ROUTES } from "@/core/routes";
import { KidModeExit } from "./kid-mode-exit";

interface KidModeAppViewProps {
  paramsPromise: Promise<{ patientId: string; appId: string }>;
}

export function KidModeAppView({ paramsPromise }: KidModeAppViewProps) {
  const { patientId, appId } = use(paramsPromise);
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();

  const bundleHtml = useQuery(
    api.childApps.getBundleForApp,
    isAuthenticated
      ? { patientId: patientId as Id<"patients">, appId: appId as Id<"apps"> }
      : "skip"
  );

  const handleVerifyPIN = async (pin: string): Promise<boolean> => {
    try {
      const result = await fetch("/api/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, pin }),
      });
      return result.ok && (await result.json()).valid;
    } catch {
      return false;
    }
  };

  const gridUrl = ROUTES.FAMILY_PLAY(patientId);

  if (bundleHtml === undefined) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
      </div>
    );
  }

  if (bundleHtml === null) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-lg text-muted-foreground">App not found</p>
        <button
          onClick={() => router.push(gridUrl)}
          className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to apps
        </button>
      </div>
    );
  }

  return (
    <>
      <KidModeExit
        onVerify={handleVerifyPIN}
        onExit={() => router.push(ROUTES.FAMILY_CHILD(patientId))}
      />

      <FullscreenAppView
        bundleHtml={bundleHtml}
        onExit={() => router.push(gridUrl)}
        disableEscapeKey
      />

      <button
        onClick={() => router.push(gridUrl)}
        className="fixed left-4 top-4 z-[60] rounded-full bg-black/50 p-3 text-white backdrop-blur-sm transition-all hover:bg-black/70 active:scale-95"
        aria-label="Back to apps"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
    </>
  );
}
