"use client";

import { templateRegistry } from "../../lib/registry";

interface QuickStartCardsProps {
  onSelect: (templateType: string) => void;
  disabled?: boolean;
}

export function QuickStartCards({ onSelect, disabled }: QuickStartCardsProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground text-center">
        Or start from a template
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {Object.values(templateRegistry).map((t) => (
          <button
            key={t.meta.id}
            onClick={() => onSelect(t.meta.id)}
            disabled={disabled}
            className="px-3 py-1.5 rounded-full border border-border text-sm text-muted-foreground hover:border-primary hover:text-foreground transition-colors duration-200 disabled:opacity-40 disabled:pointer-events-none"
          >
            {t.meta.name}
          </button>
        ))}
      </div>
    </div>
  );
}
