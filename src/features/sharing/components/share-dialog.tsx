"use client";

import { useState } from "react";
import QRCode from "react-qr-code";

import { copyToClipboard } from "@/core/clipboard";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

type ShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareSlug: string;
  appTitle: string;
};

export function ShareDialog({
  open,
  onOpenChange,
  shareSlug,
  appTitle,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = shareSlug ? `${origin}/tool/${shareSlug}` : "";
  const isLoading = !shareUrl;

  async function handleCopy() {
    await copyToClipboard(shareUrl, "Link copied!");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    try {
      await navigator.share({ title: appTitle, url: shareUrl });
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
          <DialogDescription className="sr-only">
            Share your app via link or QR code
          </DialogDescription>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-surface-container transition-colors duration-300 rounded-full text-on-surface-variant"
            aria-label="Close"
          >
            <MaterialIcon icon="close" size="sm" />
          </button>
        </DialogHeader>

        {/* QR Code */}
        <div className="flex justify-center">
          <div className="w-40 h-40 border border-surface-container-low rounded-xl p-2 flex items-center justify-center">
            {isLoading ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <QRCode value={shareUrl} size={140} />
            )}
          </div>
        </div>

        {/* URL Input Row */}
        <div className="flex gap-2">
          <div className="flex-1 bg-surface-container-low px-4 py-2.5 rounded-lg flex items-center">
            <span className="text-sm text-on-surface truncate">
              {isLoading ? "Creating share link..." : shareUrl}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 text-primary font-medium text-sm hover:bg-primary-fixed/20 transition-all rounded-lg disabled:opacity-50"
          >
            <MaterialIcon icon={copied ? "check" : "content_copy"} size="xs" />
            {copied ? "Copied!" : "Copy Link"}
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
