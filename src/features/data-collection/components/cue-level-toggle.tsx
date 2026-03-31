"use client";

import { cn } from "@/core/utils";

import type { CueLevel } from "../hooks/use-data-collection";

const CUE_LEVELS: { value: CueLevel; label: string; shortLabel: string }[] = [
  { value: "independent", label: "Independent", shortLabel: "Indep" },
  { value: "min-cue", label: "Min Cue", shortLabel: "Min" },
  { value: "mod-cue", label: "Mod Cue", shortLabel: "Mod" },
  { value: "max-cue", label: "Max Cue", shortLabel: "Max" },
];

interface CueLevelToggleProps {
  value: CueLevel;
  onChange: (level: CueLevel) => void;
}

export function CueLevelToggle({ value, onChange }: CueLevelToggleProps) {
  return (
    <div className="flex gap-1 rounded-xl bg-muted p-1 mx-4">
      {CUE_LEVELS.map((level) => (
        <button
          key={level.value}
          type="button"
          onClick={() => onChange(level.value)}
          className={cn(
            "flex-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors duration-300",
            "touch-manipulation select-none",
            value === level.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-pressed={value === level.value}
          aria-label={level.label}
        >
          <span className="hidden sm:inline">{level.label}</span>
          <span className="sm:hidden">{level.shortLabel}</span>
        </button>
      ))}
    </div>
  );
}
