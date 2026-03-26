"use client";

import { useState } from "react";
import QRCode from "react-qr-code";

import { copyToClipboard } from "@/core/clipboard";
import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
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
  appTitle: string;
  publishedUrl?: string;
};

export function ShareDialog({
  open,
  onOpenChange,
  shareSlug,
  appTitle,
  publishedUrl,
}: ShareDialogProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "published">("preview");

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const previewUrl = `${origin}/tool/${shareSlug}`;
  const activeUrl = activeTab === "published" && publishedUrl ? publishedUrl : previewUrl;

  async function handleCopy() {
    await copyToClipboard(activeUrl, "Link copied!");
  }

  async function handleShare() {
    try {
      await navigator.share({ title: appTitle, url: activeUrl });
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
            Share &apos;{appTitle}&apos;
          </DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-surface-container transition-colors rounded-full text-on-surface-variant"
            aria-label="Close"
          >
            <MaterialIcon icon="close" size="sm" />
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
            <MaterialIcon icon="content_copy" size="xs" />
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
              <MaterialIcon icon="share" size="xs" />
              Share
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
