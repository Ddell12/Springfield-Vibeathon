"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";

import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";

interface PublishSheetProps {
  open: boolean;
  onClose: () => void;
  isSaving: boolean;
  publishedShareToken: string | null;
  onPublish: () => Promise<string | null>;
}

export function PublishSheet({
  open,
  onClose,
  isSaving,
  publishedShareToken,
  onPublish,
}: PublishSheetProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = publishedShareToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/apps/${publishedShareToken}`
    : null;

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-[400px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Publish app</SheetTitle>
          <SheetDescription>
            Create a shareable link for parents and caregivers. No login required to use it.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 mt-6">
          {!publishedShareToken ? (
            <Button
              className="w-full"
              disabled={isSaving}
              onClick={() => void onPublish()}
            >
              {isSaving ? "Publishing…" : "Publish app"}
            </Button>
          ) : (
            <>
              <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
                <span className="flex-1 truncate font-mono text-xs text-foreground">
                  {shareUrl}
                </span>
                <Button variant="ghost" size="sm" onClick={() => void handleCopy()}>
                  {copied ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <a href={shareUrl!} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Patient assignment, QR code, and session mode are coming in the next update.
              </p>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
