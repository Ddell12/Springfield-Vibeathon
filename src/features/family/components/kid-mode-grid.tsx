"use client";

import { use } from "react";
import { useQuery, useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { Gamepad2 } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ROUTES } from "@/core/routes";
import { KidModeTile } from "./kid-mode-tile";
import { KidModeExit } from "./kid-mode-exit";

interface KidModeGridProps {
  paramsPromise: Promise<{ patientId: string }>;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function KidModeGrid({ paramsPromise }: KidModeGridProps) {
  const { patientId } = use(paramsPromise);
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();

  const patient = useQuery(
    api.patients.get,
    isAuthenticated ? { patientId: patientId as Id<"patients"> } : "skip"
  );

  const childApps = useQuery(
    api.childApps.listByPatient,
    isAuthenticated ? { patientId: patientId as Id<"patients"> } : "skip"
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

  if (!isAuthenticated || patient === undefined || childApps === undefined) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  const childName = patient?.firstName ?? "friend";
  const greeting = getGreeting();

  const appTiles = (childApps ?? []).map((ca) => ({
    id: ca.appId as string,
    title: ca.label ?? ca.appTitle,
    isPractice: false,
  }));

  return (
    <div className="flex min-h-screen flex-col p-6">
      <KidModeExit
        onVerify={handleVerifyPIN}
        onExit={() => router.push(ROUTES.FAMILY_CHILD(patientId))}
      />

      <div className="mb-8 text-center">
        <h1 className="font-headline text-3xl font-bold text-foreground">
          {greeting}, {childName}!
        </h1>
      </div>

      {appTiles.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Gamepad2 className="h-10 w-10 text-primary/40" />
          </div>
          <p className="text-lg font-medium text-muted-foreground">
            No apps yet! Ask your therapist or parent to add some.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {appTiles.map((tile) => (
            <KidModeTile
              key={tile.id}
              patientId={patientId}
              appId={tile.id}
              title={tile.title}
              isPractice={tile.isPractice}
            />
          ))}
        </div>
      )}
    </div>
  );
}
