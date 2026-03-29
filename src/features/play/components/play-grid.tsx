"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { Settings, Loader2 } from "lucide-react";
import { useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { PlayAuthGuard } from "./play-auth-guard";
import { AppTile } from "./app-tile";
import { usePlayData } from "../hooks/use-play-data";

interface PlayGridProps {
  paramsPromise: Promise<{ patientId: string }>;
}

function PlayGridInner({ patientId }: { patientId: string }) {
  const patient = useQuery(api.patients.getForPlay, {
    patientId: patientId as Id<"patients">,
  });
  const { apps, isLoading } = usePlayData(patientId as Id<"patients">);

  useEffect(() => {
    const manifestUrl = `/family/${patientId}/play/manifest.json`;
    const link = document.querySelector('link[rel="manifest"]');
    if (link) {
      link.setAttribute("href", manifestUrl);
    } else {
      const newLink = document.createElement("link");
      newLink.rel = "manifest";
      newLink.href = manifestUrl;
      document.head.appendChild(newLink);
    }
    return () => {
      const playLink = document.querySelector(`link[rel="manifest"][href="${manifestUrl}"]`);
      playLink?.remove();
    };
  }, [patientId]);

  const firstName = patient?.firstName ?? "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-teal-50/30">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4">
        <h1 className="text-2xl font-bold text-foreground font-[family-name:var(--font-manrope)]">
          {firstName ? `${firstName}'s Activities` : "Activities"}
        </h1>
        <Link
          href={`/family/${patientId}`}
          className="rounded-full p-2 text-muted-foreground hover:bg-muted/50 transition-colors duration-300"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </header>

      {/* Content */}
      <main className="px-6 pb-8">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !apps || apps.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
            <span className="text-5xl" role="img" aria-hidden="true">🎯</span>
            <p className="text-lg font-semibold text-foreground font-[family-name:var(--font-manrope)]">
              No activities yet
            </p>
            <p className="text-sm text-muted-foreground">
              Your therapist will add activities here soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {apps.map((app, index) => (
              <AppTile
                key={app.appId}
                appId={app.appId}
                patientId={patientId}
                title={app.title}
                index={index}
                hasPracticeProgram={app.hasPracticeProgram}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export function PlayGrid({ paramsPromise }: PlayGridProps) {
  const { patientId } = use(paramsPromise);

  return (
    <PlayAuthGuard patientId={patientId}>
      <PlayGridInner patientId={patientId} />
    </PlayAuthGuard>
  );
}
