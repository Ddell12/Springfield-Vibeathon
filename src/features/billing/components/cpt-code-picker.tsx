"use client";

import { cn } from "@/core/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

import { CPT_CODES } from "../lib/cpt-codes";

interface CptCodePickerProps {
  value: string;
  onChange: (code: string, description: string) => void;
  disabled?: boolean;
  className?: string;
}

export function CptCodePicker({ value, onChange, disabled, className }: CptCodePickerProps) {
  return (
    <Select
      value={value}
      onValueChange={(code) => {
        const entry = CPT_CODES.find((c) => c.code === code);
        if (entry) onChange(entry.code, entry.description);
      }}
      disabled={disabled}
    >
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder="Select CPT code" />
      </SelectTrigger>
      <SelectContent>
        {CPT_CODES.map((cpt) => (
          <SelectItem key={cpt.code} value={cpt.code}>
            {cpt.code} — {cpt.description}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
