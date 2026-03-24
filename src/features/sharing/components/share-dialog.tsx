"use client";

import QRCode from "react-qr-code";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { MaterialIcon } from "@/shared/components/material-icon";

type ShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareSlug: string;
  toolTitle: string;
};

export function ShareDialog({
  open,
  onOpenChange,
  shareSlug,
  toolTitle,
}: ShareDialogProps) {
  const url = `${window.location.origin}/tool/${shareSlug}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    toast("Link copied!");
  }

  async function handleShare() {
    await navigator.share({ title: toolTitle, url });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share &quot;{toolTitle}&quot;</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-2">
          {/* QR Code */}
          <div className="flex justify-center">
            <QRCode value={url} size={160} />
          </div>

          {/* URL input + copy */}
          <div className="flex gap-2">
            <Input value={url} readOnly className="flex-1 text-sm" />
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
