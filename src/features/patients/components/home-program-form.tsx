"use client";

import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface HomeProgramFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: Id<"patients">;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function HomeProgramForm({ open, onOpenChange, patientId }: HomeProgramFormProps) {
  const createProgram = useMutation(api.homePrograms.create);

  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "3x-week" | "weekly" | "as-needed" | undefined>(undefined);
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setTitle("");
    setInstructions("");
    setFrequency(undefined);
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
    if (endDate && endDate < startDate) {
      toast.error("End date must be on or after start date");
      return;
    }

    setIsSubmitting(true);
    try {
      await createProgram({
        patientId,
        title: title.trim(),
        instructions: instructions.trim(),
        frequency: frequency as "daily" | "3x-week" | "weekly" | "as-needed",
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
            <Select value={frequency || undefined} onValueChange={(v) => setFrequency(v as "daily" | "3x-week" | "weekly" | "as-needed")}>
              <SelectTrigger id="hp-frequency">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="3x-week">3x per week</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="as-needed">As needed</SelectItem>
              </SelectContent>
            </Select>
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
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? "Assigning..." : "Assign Program"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
