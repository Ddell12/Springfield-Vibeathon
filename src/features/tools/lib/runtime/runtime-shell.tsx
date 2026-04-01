"use client";

import { X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

export function RuntimeShell({
  mode,
  onExit,
  children,
}: {
  mode: "preview" | "published";
  onExit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-background/95 px-4 py-3 backdrop-blur">
        <p className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
          {mode === "preview" ? "Live preview" : "Published app"}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onExit}
          aria-label={mode === "preview" ? "Exit fullscreen" : "Exit app"}
        >
          <X className="mr-1 h-4 w-4" />
          Exit
        </Button>
      </div>
      <div className="px-4 pb-6 pt-4">{children}</div>
    </div>
  );
}
