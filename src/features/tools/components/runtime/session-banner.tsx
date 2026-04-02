"use client";

import { useEffect, useState } from "react";

interface SessionBannerProps {
  patientName?: string;
}

export function SessionBanner({ patientName }: SessionBannerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const elapsedStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="sticky top-0 z-40 flex items-center gap-2 bg-primary/10 border-b border-primary/20 px-4 py-1.5 text-xs text-primary font-medium">
      <span>Session</span>
      <span className="text-primary/50">·</span>
      <span>{dateStr}</span>
      {patientName && (
        <>
          <span className="text-primary/50">·</span>
          <span>{patientName}</span>
        </>
      )}
      <span className="text-primary/50">·</span>
      <span className="font-mono">{elapsedStr}</span>
    </div>
  );
}
