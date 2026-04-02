"use client";

import { Button } from "@/shared/components/ui/button";

export function FullscreenPreviewButton({
  onOpen,
  onBrowserFullscreen,
}: {
  onOpen: () => void;
  onBrowserFullscreen: () => void;
}) {
  return (
    <div className="flex gap-2">
      <Button type="button" size="sm" onClick={onOpen}>
        Full screen
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onBrowserFullscreen}
      >
        Browser fullscreen
      </Button>
    </div>
  );
}
