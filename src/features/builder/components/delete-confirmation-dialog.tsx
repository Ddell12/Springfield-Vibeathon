"use client";

import { AlertTriangle } from "lucide-react";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/components/ui/dialog";

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  onConfirmDelete: () => void;
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  projectName,
  onConfirmDelete,
}: DeleteConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="rounded-2xl p-10 sm:max-w-sm gap-0"
        showCloseButton={false}
      >
        {/* Warning Icon */}
        <div className="w-12 h-12 rounded-full bg-error flex items-center justify-center mb-8">
          <AlertTriangle className="size-6 text-on-error" fill="currentColor" />
        </div>

        {/* Content */}
        <div className="space-y-4 mb-10">
          <DialogTitle className="font-headline font-semibold text-2xl text-on-surface leading-tight tracking-tight">
            Delete &apos;{projectName}&apos;?
          </DialogTitle>
          <DialogDescription className="text-sm text-on-surface-variant leading-relaxed">
            This action cannot be undone. The tool and all its data will be permanently removed.
          </DialogDescription>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-6">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className={cn(
              "text-sm font-semibold text-on-surface-variant uppercase tracking-widest",
              "hover:text-on-surface"
            )}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onConfirmDelete();
              onOpenChange(false);
            }}
            className={cn(
              "bg-error text-on-error font-semibold text-sm uppercase tracking-widest",
              "px-8 py-4 h-auto rounded-md shadow-md",
              "hover:bg-error/90 transition-all"
            )}
          >
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
