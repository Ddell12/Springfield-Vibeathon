"use client";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/core/utils";

const PRESETS = [30, 45, 60] as const;

interface DurationPresetInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function DurationPresetInput({ value, onChange, disabled }: DurationPresetInputProps) {
  const isPreset = PRESETS.includes(value as (typeof PRESETS)[number]);

  function handleCustomChange(raw: string) {
    if (raw === "") {
      onChange(0);
      return;
    }
    const num = Math.max(5, Math.min(480, Number(raw)));
    if (!Number.isNaN(num)) {
      onChange(num);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {PRESETS.map((preset) => (
        <Button
          key={preset}
          type="button"
          variant={value === preset ? "default" : "outline"}
          size="sm"
          disabled={disabled}
          onClick={() => onChange(preset)}
          className={cn(
            "min-w-[52px]",
            value === preset &&
              "bg-gradient-to-br from-[#00595c] to-[#0d7377] text-white hover:from-[#00595c]/90 hover:to-[#0d7377]/90",
          )}
        >
          {preset}
        </Button>
      ))}

      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          min={5}
          max={480}
          value={!isPreset && value > 0 ? value : ""}
          placeholder="Custom"
          onChange={(e) => handleCustomChange(e.target.value)}
          disabled={disabled}
          className="w-20"
        />
        <span className="text-sm text-muted-foreground">min</span>
      </div>
    </div>
  );
}
