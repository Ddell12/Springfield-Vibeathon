"use client";

import { Minimize2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface FullscreenAppViewProps {
  bundleHtml: string;
  onExit: () => void;
  disableEscapeKey?: boolean;
}

export function FullscreenAppView({
  bundleHtml,
  onExit,
  disableEscapeKey = false,
}: FullscreenAppViewProps) {
  const [showControls, setShowControls] = useState(true);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const blobUrl = useMemo(() => {
    const blob = new Blob([bundleHtml], { type: "text/html" });
    return URL.createObjectURL(blob);
  }, [bundleHtml]);

  useEffect(() => {
    fadeTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  const resetFadeTimer = useCallback(() => {
    setShowControls(true);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    const handler = () => resetFadeTimer();
    window.addEventListener("mousemove", handler);
    window.addEventListener("touchstart", handler);
    return () => {
      window.removeEventListener("mousemove", handler);
      window.removeEventListener("touchstart", handler);
    };
  }, [resetFadeTimer]);

  useEffect(() => {
    if (disableEscapeKey) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [disableEscapeKey, onExit]);

  return (
    <div className="fixed inset-0 z-50 bg-white">
      <iframe
        ref={iframeRef}
        title="App fullscreen"
        src={blobUrl}
        sandbox="allow-scripts"
        className="h-full w-full border-0"
      />

      <button
        onClick={onExit}
        className={`fixed right-4 top-4 z-[60] flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-opacity duration-300 hover:bg-black/70 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-label="Exit fullscreen"
      >
        <Minimize2 className="h-4 w-4" />
        Exit
      </button>
    </div>
  );
}
