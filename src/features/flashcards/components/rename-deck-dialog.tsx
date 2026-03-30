"use client";

import { startTransition, useEffect, useState } from "react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";

interface RenameDeckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
  onConfirm: (newName: string) => void;
}

export function RenameDeckDialog({
  open,
  onOpenChange,
  currentName,
  onConfirm,
}: RenameDeckDialogProps) {
  const [name, setName] = useState(currentName);

  useEffect(() => {
    if (open) startTransition(() => setName(currentName));
  }, [open, currentName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed === currentName) {
      onOpenChange(false);
      return;
    }
    onConfirm(trimmed);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="rounded-2xl p-10 sm:max-w-sm gap-0"
        showCloseButton={false}
      >
        <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-full bg-primary-container">
          <MaterialIcon icon="edit" size="md" className="text-on-primary-container" filled />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <DialogTitle className="text-2xl font-semibold leading-tight tracking-tight text-on-surface">
              Rename deck
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-on-surface-variant">
              Give your flashcard deck a new name.
            </DialogDescription>
          </div>

          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Deck name"
            maxLength={100}
            autoFocus
            className="rounded-lg"
            aria-label="Deck name"
          />

          <div className="flex items-center justify-end gap-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className={cn(
                "text-sm font-semibold uppercase tracking-widest text-on-surface-variant",
                "hover:text-on-surface",
              )}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || name.trim() === currentName}
              className={cn(
                "bg-primary font-semibold text-sm uppercase tracking-widest text-on-primary",
                "px-8 py-4 h-auto rounded-md shadow-md",
                "hover:bg-primary/90 transition-all",
              )}
            >
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
