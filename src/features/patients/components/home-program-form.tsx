"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import type { Id } from "../../../../convex/_generated/dataModel";

const extendedApi = api as any;

interface HomeProgramFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: Id<"patients">;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function HomeProgramForm({ open, onOpenChange, patientId }: HomeProgramFormProps) {
  const createProgram = useMutation(extendedApi.homePrograms.create);

  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [frequency, setFrequency] = useState<string>("");
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setTitle("");
    setInstructions("");
    setFrequency("");
    setStartDate(todayIso());
    setEndDate("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!instructions.trim()) {
      toast.error("Instructions are required");
      return;
    }
    if (!frequency) {
      toast.error("Frequency is required");
      return;
    }
    if (!startDate) {
      toast.error("Start date is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await createProgram({
        patientId,
        title: title.trim(),
        instructions: instructions.trim(),
        frequency,
        startDate,
        endDate: endDate || undefined,
      });
      toast.success("Home program assigned");
      resetForm();
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to create home program");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenChange(value: boolean) {
    if (!value) resetForm();
    onOpenChange(value);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Home Program</DialogTitle>
          <DialogDescription>
            Create a practice program for the caregiver to follow at home.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hp-title">Title</Label>
            <Input
              id="hp-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Morning articulation warm-up"
              maxLength={200}
              required
            />
          </div>

          {/* Instructions */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hp-instructions">Instructions</Label>
            <Textarea
              id="hp-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Write in parent-friendly language — no jargon"
              maxLength={2000}
              rows={4}
              required
            />
            <p className="text-xs text-muted-foreground">
              Write in parent-friendly language — no jargon
            </p>
          </div>

          {/* Frequency */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hp-frequency">Frequency</Label>
            <select
              id="hp-frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              required
            >
              <option value="" disabled>Select frequency</option>
              <option value="daily">Daily</option>
              <option value="3x-week">3x per week</option>
              <option value="weekly">Weekly</option>
              <option value="as-needed">As needed</option>
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="hp-start-date">Start Date</Label>
              <Input
                id="hp-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="hp-end-date">
                End Date{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="hp-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Assigning..." : "Assign Program"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
