"use client";

import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";

type PublishStatus = "idle" | "building" | "done" | "error";

type PublishDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublish: () => void;
  projectTitle: string;
  status: PublishStatus;
  publishedUrl?: string;
  errorMessage?: string;
};

export function PublishDialog({
  open,
  onOpenChange,
  onPublish,
  projectTitle,
  status,
  publishedUrl,
  errorMessage,
}: PublishDialogProps) {
  const handleCopy = () => {
    if (!publishedUrl) return;
    navigator.clipboard.writeText(publishedUrl).then(() => toast("URL copied!")).catch(() => {});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish &quot;{projectTitle}&quot;</DialogTitle>
          <DialogDescription>
            Share your therapy tool with anyone — no login required.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {status === "idle" && (
            <p className="text-sm text-on-surface-variant">
              Your tool will be published to a public URL that anyone can visit.
            </p>
          )}

          {status === "building" && (
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <span className="text-sm text-on-surface-variant">Publishing your tool...</span>
            </div>
          )}

          {status === "done" && publishedUrl && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-on-surface">Your tool is live!</p>
              <div className="flex gap-2">
                <Input value={publishedUrl} readOnly className="flex-1 text-sm" />
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label="Copy URL"
                  className="inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          {status === "error" && (
            <p className="text-sm text-error">
              {errorMessage ?? "Failed to publish — please try again."}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {status === "idle" && (
            <Button onClick={onPublish}>
              Publish
            </Button>
          )}
          {status === "error" && (
            <Button onClick={onPublish}>
              Try again
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
