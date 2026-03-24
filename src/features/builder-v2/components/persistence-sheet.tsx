"use client";

import { useState } from "react";

import { cn } from "@/core/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";

type PersistenceTier = "session" | "device" | "cloud";

type PersistenceSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (tier: PersistenceTier) => void;
  defaultValue?: PersistenceTier;
};

const OPTIONS: { value: PersistenceTier; label: string; description: string; icon: string }[] = [
  {
    value: "session",
    label: "This session",
    description: "Only available while this tab is open.",
    icon: "tab",
  },
  {
    value: "device",
    label: "Save on this device",
    description: "Saved to your browser. Available next time you visit.",
    icon: "devices",
  },
  {
    value: "cloud",
    label: "Save to cloud",
    description: "Access from any device. Requires sign-in.",
    icon: "cloud",
  },
];

export function PersistenceSheet({ open, onOpenChange, onSelect, defaultValue = "device" }: PersistenceSheetProps) {
  const [selected, setSelected] = useState<PersistenceTier>(defaultValue);

  const handleSelect = (tier: PersistenceTier) => {
    setSelected(tier);
    onSelect(tier);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>How would you like to save your tool?</SheetTitle>
          <SheetDescription>
            Choose how Bridges stores your therapy tools.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-3 mt-4 pb-6">
          {OPTIONS.map((option) => {
            const isSelected = selected === option.value;
            return (
              <button
                key={option.value}
                role="radio"
                aria-checked={isSelected}
                data-selected={isSelected ? "true" : undefined}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-2xl text-left transition-colors",
                  isSelected
                    ? "bg-primary/10 text-primary"
                    : "bg-surface-container-low hover:bg-surface-container-high text-on-surface"
                )}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">{option.label}</span>
                  <span className="text-xs text-on-surface-variant">{option.description}</span>
                </div>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
