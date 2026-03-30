"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/core/utils";

interface PracticeLogFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programTitle: string;
  onSubmit: (data: {
    duration?: number;
    confidence?: number;
    notes?: string;
  }) => Promise<void>;
}

export function PracticeLogForm({
  open,
  onOpenChange,
  programTitle,
  onSubmit,
}: PracticeLogFormProps) {
  const [duration, setDuration] = useState<string>("");
  const [confidence, setConfidence] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setDuration("");
      setConfidence(0);
      setNotes("");
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        duration: duration !== "" ? Number(duration) : undefined,
        confidence: confidence > 0 ? confidence : undefined,
        notes: notes.trim() !== "" ? notes.trim() : undefined,
      });
      toast.success("Practice logged! Great work today.");
      handleClose(false);
    } catch {
      toast.error("Couldn't save practice log. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Log Practice
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {programTitle}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-2">
          {/* Duration */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="practice-duration" className="text-sm font-medium">
              How long? (minutes)
            </Label>
            <Input
              id="practice-duration"
              type="number"
              min="0"
              placeholder="e.g. 10"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-32"
            />
          </div>

          {/* Confidence stars */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">How did it go?</Label>
            <div className="flex gap-1" role="radiogroup" aria-label="How did it go? Confidence rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setConfidence(star)}
                  aria-label={`${star} star${star !== 1 ? "s" : ""}`}
                  className={cn(
                    "text-2xl transition-colors duration-200",
                    star <= confidence
                      ? "text-caution"
                      : "text-muted-foreground/30 hover:text-caution"
                  )}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="practice-notes" className="text-sm font-medium">
              Notes
            </Label>
            <Textarea
              id="practice-notes"
              placeholder="Any observations? (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "w-full text-white",
              "bg-primary-gradient",
              "hover:opacity-90 transition-opacity duration-300",
              isSubmitting && "opacity-60"
            )}
          >
            {isSubmitting ? "Saving…" : "Log Practice"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
