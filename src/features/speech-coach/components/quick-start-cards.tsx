"use client";

import { cn } from "@/core/utils";

import { SYSTEM_TEMPLATES } from "../lib/system-templates";

type Props = {
  onSelect: (systemTemplateId: string) => void;
};

export function QuickStartCards({ onSelect }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Pick a starting point. You can adjust it for this child right after.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {SYSTEM_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template.id)}
            className={cn(
              "rounded-2xl bg-background p-5 text-left",
              "transition-colors duration-300",
              "hover:bg-primary/5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            )}
          >
            <p className="font-headline text-base font-semibold text-foreground">
              {template.name}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {template.description}
            </p>
            <p className="mt-3 text-xs text-primary">
              {template.sessionDefaults.defaultDurationMinutes} min · Ages{" "}
              {template.sessionDefaults.ageRange}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
