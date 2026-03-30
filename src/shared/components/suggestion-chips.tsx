"use client";

import { Button } from "@/shared/components/ui/button";

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

export function SuggestionChips({ suggestions, onSelect }: SuggestionChipsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-4 pb-2">
      {suggestions.map((suggestion) => (
        <Button
          key={suggestion}
          variant="outline"
          size="sm"
          onClick={() => onSelect(suggestion)}
          className="rounded-full bg-surface-container px-4 text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
        >
          {suggestion}
        </Button>
      ))}
    </div>
  );
}
