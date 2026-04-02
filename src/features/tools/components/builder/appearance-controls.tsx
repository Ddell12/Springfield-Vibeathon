"use client";

import { cn } from "@/core/utils";
import type { ThemePreset } from "@/features/tools/lib/runtime/app-shell-types";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

const PRESETS: { value: ThemePreset; label: string }[] = [
  { value: "calm", label: "Calm" },
  { value: "playful", label: "Playful" },
  { value: "focused", label: "Focused" },
];

export function AppearanceControls({
  value,
  onChange,
}: {
  value: { themePreset: ThemePreset; accentColor: string };
  onChange: (value: { themePreset: ThemePreset; accentColor: string }) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium text-foreground mb-2">Theme</p>
        <div className="flex gap-2">
          {PRESETS.map((preset) => (
            <Button
              key={preset.value}
              type="button"
              variant={value.themePreset === preset.value ? "default" : "outline"}
              size="sm"
              onClick={() => onChange({ ...value, themePreset: preset.value })}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="appearance-accent-color">Accent color</Label>
        <Input
          id="appearance-accent-color"
          type="color"
          value={value.accentColor}
          onChange={(e) => onChange({ ...value, accentColor: e.target.value })}
          className={cn("h-9 w-full cursor-pointer")}
        />
      </div>
    </div>
  );
}
