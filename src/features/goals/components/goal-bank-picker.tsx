"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/core/utils";
import {
  type GoalDomain,
  type GoalTemplate,
  getTemplatesByDomain,
  fillTemplate,
} from "../lib/goal-bank-data";
import { domainLabel, domainColor } from "../lib/goal-utils";

const DOMAINS: GoalDomain[] = [
  "articulation",
  "language-receptive",
  "language-expressive",
  "fluency",
  "voice",
  "pragmatic-social",
  "aac",
  "feeding",
];

interface GoalBankPickerProps {
  onSelect: (template: GoalTemplate) => void;
}

export function GoalBankPicker({ onSelect }: GoalBankPickerProps) {
  const [selectedDomain, setSelectedDomain] = useState<GoalDomain | null>(null);
  const templates = selectedDomain ? getTemplatesByDomain(selectedDomain) : [];

  return (
    <div className="flex flex-col gap-4">
      <Select
        value={selectedDomain ?? ""}
        onValueChange={(v) => setSelectedDomain(v as GoalDomain)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Choose a domain..." />
        </SelectTrigger>
        <SelectContent>
          {DOMAINS.map((d) => (
            <SelectItem key={d} value={d}>
              {domainLabel(d)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {templates.length > 0 && (
        <div className="flex flex-col gap-2">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t)}
              className={cn(
                "flex flex-col gap-1 rounded-lg border border-border p-3 text-left transition-colors duration-300",
                "hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", domainColor(t.domain))}>
                  {domainLabel(t.domain)}
                </span>
                <span className="text-sm font-medium">{t.shortDescription}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {fillTemplate(t, t.defaultTargetAccuracy, t.defaultConsecutiveSessions)}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
