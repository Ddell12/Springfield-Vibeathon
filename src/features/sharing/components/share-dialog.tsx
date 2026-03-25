"use client";

import { Copy, Share2, X } from "lucide-react";
import { useState } from "react";
import QRCode from "react-qr-code";
import { toast } from "sonner";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

type ShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareSlug: string;
  toolTitle: string;
  publishedUrl?: string;
};

export function ShareDialog({
  open,
  onOpenChange,
  shareSlug,
  toolTitle,
  publishedUrl,
}: ShareDialogProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "published">("preview");

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const previewUrl = `${origin}/tool/${shareSlug}`;
  const activeUrl = activeTab === "published" && publishedUrl ? publishedUrl : previewUrl;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(activeUrl);
      toast.success("Link copied!");
    } catch {
      toast.error("Failed to copy — try selecting and copying manually");
    }
  }

  async function handleShare() {
    try {
      await navigator.share({ title: toolTitle, url: activeUrl });
    } catch {
      // User cancelled or share not supported — no-op
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl p-6 gap-6 sm:max-w-[420px]" showCloseButton={false}>
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="font-headline font-semibold text-lg text-on-surface">
            Share &apos;{toolTitle}&apos;
          </DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-surface-container transition-colors rounded-full text-on-surface-variant"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </DialogHeader>

        {/* Segmented Tab Toggle */}
        <div className="bg-surface-container-low p-1 rounded-lg flex">
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={cn(
              "flex-1 py-1.5 text-sm font-medium rounded-md transition-all",
              activeTab === "preview"
                ? "bg-surface-container-lowest text-primary shadow-sm font-semibold"
                : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            Preview Link
          </button>
          {publishedUrl && (
            <button
              type="button"
              onClick={() => setActiveTab("published")}
              className={cn(
                "flex-1 py-1.5 text-sm font-medium rounded-md transition-all",
                activeTab === "published"
                  ? "bg-surface-container-lowest text-primary shadow-sm font-semibold"
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              Published Link
            </button>
          )}
        </div>

        {/* QR Code */}
        <div className="flex justify-center">
          <div className="w-40 h-40 border border-surface-container-low rounded-xl p-2 flex items-center justify-center">
            <QRCode value={activeUrl} size={140} />
          </div>
        </div>

        {/* URL Input Row */}
        <div className="flex gap-2">
          <div className="flex-1 bg-surface-container-low px-4 py-2.5 rounded-lg flex items-center">
            <span className="text-sm text-on-surface truncate">{activeUrl}</span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2.5 text-primary font-medium text-sm hover:bg-primary-fixed/20 transition-all rounded-lg"
          >
            <Copy className="size-4" />
            Copy Link
          </button>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-on-surface-variant hover:text-on-surface"
          >
            Close
          </Button>
          {"share" in navigator && typeof navigator.share === "function" && (
            <Button
              onClick={handleShare}
              className="bg-gradient-to-br from-primary to-primary-container text-on-primary hover:opacity-90 shadow-sm"
            >
              <Share2 className="size-4" />
              Share
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
