"use client";

import { toast } from "sonner";

import { copyToClipboard } from "@/core/clipboard";
import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/components/ui/dialog";

interface PublishSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  publishedUrl: string;
  onBackToBuilder: () => void;
}

export function PublishSuccessModal({
  open,
  onOpenChange,
  projectName,
  publishedUrl,
  onBackToBuilder,
}: PublishSuccessModalProps) {
  async function handleCopyUrl() {
    await copyToClipboard(publishedUrl, "Link copied!");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="rounded-2xl p-8 sm:max-w-[440px] gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* Celebration Area with Confetti */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            {/* Decorative Confetti Dots */}
            <div className="absolute -top-4 -left-6 w-3 h-3 rounded-full bg-primary-container" />
            <div className="absolute -top-8 right-2 w-4 h-4 rounded-full bg-tertiary-fixed" />
            <div className="absolute bottom-2 -right-10 w-3 h-3 rounded-full bg-secondary" />
            <div className="absolute -bottom-6 -left-2 w-2 h-2 rounded-full bg-primary" />
            <div className="absolute top-1/2 -right-8 w-2 h-2 rounded-full bg-tertiary-container" />

            {/* Checkmark Circle */}
            <div className="w-24 h-24 rounded-full bg-primary-container flex items-center justify-center relative z-10">
              <MaterialIcon icon="check" size="xl" className="text-white" />
            </div>

            {/* Decorative Rings */}
            <div className="absolute inset-0 scale-150 rounded-full border border-secondary/10 -z-0" />
            <div className="absolute inset-0 scale-[1.8] rounded-full border border-tertiary-fixed/30 -z-0" />
          </div>
        </div>

        {/* Heading & Subtext */}
        <div className="text-center space-y-3 mb-10">
          <DialogTitle className="font-headline text-3xl font-bold text-primary tracking-tight leading-none">
            Your tool is live!
          </DialogTitle>
          <DialogDescription className="text-on-surface-variant text-base leading-relaxed max-w-[320px] mx-auto">
            {projectName} is now published and ready to share.
          </DialogDescription>
        </div>

        {/* URL Input Area */}
        <div className="w-full mb-10">
          <div className="flex items-center gap-2 bg-surface-container-low p-2 rounded-lg group transition-all hover:bg-surface-container">
            <div className="flex-1 px-3 py-2 overflow-hidden text-ellipsis whitespace-nowrap text-on-surface-variant font-medium text-sm">
              {publishedUrl}
            </div>
            <button
              type="button"
              onClick={handleCopyUrl}
              className={cn(
                "flex items-center justify-center w-10 h-10",
                "bg-surface-container-lowest text-primary rounded-md",
                "shadow-sm border border-outline-variant/10",
                "hover:scale-105 active:scale-95 transition-all"
              )}
              aria-label="Copy URL"
            >
              <MaterialIcon icon="content_copy" size="sm" />
            </button>
          </div>
        </div>

        {/* Share Options Row */}
        <div className="w-full grid grid-cols-3 gap-4 mb-10">
          <button
            type="button"
            onClick={handleCopyUrl}
            className="flex flex-col items-center gap-3 py-2 group"
          >
            <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-tertiary-fixed group-hover:text-on-tertiary-fixed transition-colors">
              <MaterialIcon icon="link" size="sm" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant/70">
              Copy Link
            </span>
          </button>
          <button
            type="button"
            onClick={() => toast("QR code coming soon")}
            className="flex flex-col items-center gap-3 py-2 group"
          >
            <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-tertiary-fixed group-hover:text-on-tertiary-fixed transition-colors">
              <MaterialIcon icon="qr_code" size="sm" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant/70">
              QR Code
            </span>
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                if (navigator.share) {
                  await navigator.share({ url: publishedUrl, title: projectName });
                } else {
                  await copyToClipboard(publishedUrl, "Link copied!");
                }
              } catch {
                // User cancelled share, or clipboard access denied — no-op
              }
            }}
            className="flex flex-col items-center gap-3 py-2 group"
          >
            <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-tertiary-fixed group-hover:text-on-tertiary-fixed transition-colors">
              <MaterialIcon icon="share" size="sm" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant/70">
              Share
            </span>
          </button>
        </div>

        {/* CTAs */}
        <div className="w-full space-y-4">
          <Button
            onClick={() => {
              onBackToBuilder();
              onOpenChange(false);
            }}
            className={cn(
              "w-full py-4 h-auto",
              "bg-gradient-to-br from-primary to-primary-container text-white",
              "font-bold rounded-lg",
              "hover:brightness-110 active:scale-[0.98] transition-all"
            )}
          >
            Back to Builder
          </Button>
          <a
            href={publishedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2 text-primary font-semibold text-sm hover:underline flex justify-center items-center gap-2"
          >
            View published tool
            <MaterialIcon icon="open_in_new" size="xs" />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
