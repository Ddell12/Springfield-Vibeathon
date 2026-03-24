"use client";

import { useState } from "react";
import QRCode from "react-qr-code";
import { toast } from "sonner";

import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";

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
    await navigator.clipboard.writeText(activeUrl);
    toast("Link copied!");
  }

  async function handleShare() {
    await navigator.share({ title: toolTitle, url: activeUrl });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share &quot;{toolTitle}&quot;</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Tabs */}
          <div className="flex gap-1 bg-surface-container-low rounded-lg p-1">
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={
                activeTab === "preview"
                  ? "flex-1 py-1.5 rounded-md text-sm font-semibold bg-surface-container-lowest text-primary shadow-sm"
                  : "flex-1 py-1.5 rounded-md text-sm font-medium text-on-surface-variant"
              }
            >
              Preview Link
            </button>
            {publishedUrl && (
              <button
                type="button"
                onClick={() => setActiveTab("published")}
                className={
                  activeTab === "published"
                    ? "flex-1 py-1.5 rounded-md text-sm font-semibold bg-surface-container-lowest text-primary shadow-sm"
                    : "flex-1 py-1.5 rounded-md text-sm font-medium text-on-surface-variant"
                }
              >
                Published Link
              </button>
            )}
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <QRCode value={activeUrl} size={160} />
          </div>

          {/* URL input + copy */}
          <div className="flex gap-2">
            <Input value={activeUrl} readOnly className="flex-1 text-sm" />
            <Button variant="outline" onClick={handleCopy} aria-label="Copy Link">
              <MaterialIcon icon="content_copy" size="sm" />
              Copy Link
            </Button>
          </div>

          {/* Footer actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)} aria-label="Close">
              Close
            </Button>
            {"share" in navigator && typeof navigator.share === "function" && (
              <Button onClick={handleShare} aria-label="Share">
                <MaterialIcon icon="share" size="sm" />
                Share
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
