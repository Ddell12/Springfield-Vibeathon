"use client";

import { useQuery } from "convex/react";
import { Home, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useTtsBridge } from "../hooks/use-tts-bridge";
import { PlayAuthGuard } from "./play-auth-guard";

interface AppViewerProps {
  paramsPromise: Promise<{ patientId: string; appId: string }>;
}

function AppViewerInner({ patientId, appId }: { patientId: string; appId: string }) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const bundle = useQuery(api.generated_files.getBundleByAppId, {
    appId: appId as Id<"apps">,
  });

  useTtsBridge(iframeRef);

  useEffect(() => {
    if (bundle === undefined) return; // still loading

    if (bundle === null) {
      toast.error("This activity could not be loaded.");
      router.replace(`/family/${patientId}/play`);
      return;
    }

    const url = URL.createObjectURL(
      new Blob([bundle], { type: "text/html" })
    );
    setBlobUrl(url); // eslint-disable-line react-hooks/set-state-in-effect -- set blob URL after creation

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [bundle, patientId, router]);

  const isLoading = bundle === undefined || (bundle !== null && blobUrl === null);

  return (
    <div className="relative h-screen w-full bg-background">
      {/* Floating home button */}
      <Link
        href={`/family/${patientId}/play`}
        className="absolute top-4 left-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background/70 backdrop-blur-sm shadow-md transition-transform duration-300 hover:scale-105 active:scale-95"
        aria-label="Back to activities"
      >
        <Home className="h-5 w-5 text-foreground" />
      </Link>

      {isLoading && (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      )}

      {blobUrl && (
        <iframe
          ref={iframeRef}
          src={blobUrl}
          sandbox="allow-scripts"
          className="h-full w-full border-0"
          title="Therapy activity"
        />
      )}
    </div>
  );
}

export function AppViewer({ paramsPromise }: AppViewerProps) {
  const { patientId, appId } = use(paramsPromise);

  return (
    <PlayAuthGuard patientId={patientId}>
      <AppViewerInner patientId={patientId} appId={appId} />
    </PlayAuthGuard>
  );
}
