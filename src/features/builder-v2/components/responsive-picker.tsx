"use client";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";

type Breakpoint = "mobile" | "tablet" | "desktop";

type ResponsivePickerProps = {
  value: Breakpoint;
  onChange: (value: Breakpoint) => void;
};

const OPTIONS: { value: Breakpoint; label: string; icon: string }[] = [
  { value: "mobile", label: "Phone", icon: "smartphone" },
  { value: "tablet", label: "Tablet", icon: "tablet" },
  { value: "desktop", label: "Computer", icon: "computer" },
];

export function ResponsivePicker({ value, onChange }: ResponsivePickerProps) {
  return (
    <div className="flex items-center gap-1 bg-surface-container-low rounded-lg p-1">
      {OPTIONS.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            data-active={isActive ? "true" : undefined}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              isActive
                ? "bg-surface-container-lowest text-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            <MaterialIcon icon={option.icon} size="sm" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
