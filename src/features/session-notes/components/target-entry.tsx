"use client";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { MaterialIcon } from "@/shared/components/material-icon";
import { cn } from "@/core/utils";
import { calculateAccuracy, accuracyColor, accuracyLabel } from "../lib/session-utils";

export interface TargetData {
  target: string;
  trials?: number;
  correct?: number;
  promptLevel?: "independent" | "verbal-cue" | "model" | "physical";
  notes?: string;
}

interface TargetEntryProps {
  data: TargetData;
  onChange: (data: TargetData) => void;
  onRemove: () => void;
  disabled?: boolean;
}

const promptLevelOptions = [
  { value: "independent", label: "Independent" },
  { value: "verbal-cue", label: "Verbal Cue" },
  { value: "model", label: "Model" },
  { value: "physical", label: "Physical" },
] as const;

export function TargetEntry({ data, onChange, onRemove, disabled }: TargetEntryProps) {
  const accuracy = calculateAccuracy(data.correct, data.trials);

  function handleTrialsChange(value: string) {
    const trials = value === "" ? undefined : Math.max(1, Math.min(1000, Number(value)));
    const updated: TargetData = { ...data, trials };
    // Clamp correct to new trials max
    if (trials !== undefined && updated.correct !== undefined && updated.correct > trials) {
      updated.correct = trials;
    }
    onChange(updated);
  }

  function handleCorrectChange(value: string) {
    const max = data.trials ?? 1000;
    const correct = value === "" ? undefined : Math.max(0, Math.min(max, Number(value)));
    onChange({ ...data, correct });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-muted/50 p-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Target name */}
          <Input
            placeholder="Target name"
            value={data.target}
            onChange={(e) => onChange({ ...data, target: e.target.value })}
            disabled={disabled}
            className="sm:col-span-2 lg:col-span-1"
          />

          {/* Trials */}
          <Input
            type="number"
            placeholder="Trials"
            min={1}
            max={1000}
            value={data.trials ?? ""}
            onChange={(e) => handleTrialsChange(e.target.value)}
            disabled={disabled}
          />

          {/* Correct */}
          <Input
            type="number"
            placeholder="Correct"
            min={0}
            max={data.trials ?? 1000}
            value={data.correct ?? ""}
            onChange={(e) => handleCorrectChange(e.target.value)}
            disabled={disabled}
          />

          {/* Prompt level */}
          <Select
            value={data.promptLevel ?? ""}
            onValueChange={(value) =>
              onChange({
                ...data,
                promptLevel: value as TargetData["promptLevel"],
              })
            }
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Prompt level" />
            </SelectTrigger>
            <SelectContent>
              {promptLevelOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Accuracy badge */}
        <div
          className={cn(
            "flex h-9 min-w-[56px] items-center justify-center rounded-md px-2 text-sm font-semibold",
            accuracy !== null && accuracy >= 80 && "bg-green-100 dark:bg-green-900/30",
            accuracy !== null && accuracy >= 60 && accuracy < 80 && "bg-yellow-100 dark:bg-yellow-900/30",
            accuracy !== null && accuracy < 60 && "bg-red-100 dark:bg-red-900/30",
            accuracy === null && "bg-muted",
            accuracyColor(accuracy),
          )}
        >
          {accuracyLabel(accuracy)}
        </div>

        {/* Remove button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={disabled}
          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
          aria-label="Remove target"
        >
          <MaterialIcon icon="delete" size="sm" />
        </Button>
      </div>

      {/* Notes row */}
      <Input
        placeholder="Notes for this target"
        value={data.notes ?? ""}
        onChange={(e) => onChange({ ...data, notes: e.target.value })}
        disabled={disabled}
      />
    </div>
  );
}
