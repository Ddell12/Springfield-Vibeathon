"use client";

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

export function SuggestionChips({ suggestions, onSelect }: SuggestionChipsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-4 pb-2">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          onClick={() => onSelect(suggestion)}
          className="rounded-full border border-outline-variant/40 bg-surface-container-lowest px-3 py-1.5 text-xs text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
