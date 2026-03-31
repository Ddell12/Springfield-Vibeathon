"use client";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { VoiceInput } from "@/shared/components/voice-input";

interface InputBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  isGenerating: boolean;
  className?: string;
  showGuidedPill?: boolean;
  onGuidedClick?: () => void;
  mode?: "app" | "flashcards";
  onModeChange?: (mode: "app" | "flashcards") => void;
}

export function InputBar({
  value,
  onChange,
  onSubmit,
  placeholder,
  isGenerating,
  className,
  showGuidedPill,
  onGuidedClick,
  mode = "app",
  onModeChange,
}: InputBarProps) {
  const resolvedPlaceholder =
    mode === "flashcards"
      ? "Describe the flashcard set you want to build…"
      : placeholder ?? "What would you like to build?";
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    // scrollHeight is a runtime DOM value — no Tailwind equivalent for dynamic height measurement
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isGenerating) {
        onSubmit(value.trim());
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isGenerating) {
      onSubmit(value.trim());
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "rounded-2xl border border-outline-variant/20 bg-white px-4 pb-3 pt-3 shadow-sm",
        className,
      )}
    >
      <textarea
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={resolvedPlaceholder}
        disabled={isGenerating}
        rows={1}
        aria-label={resolvedPlaceholder}
        className="w-full resize-none overflow-hidden border-0 bg-transparent text-sm outline-none placeholder:text-on-surface-variant/40 disabled:opacity-60 min-h-[24px] max-h-[200px]"
      />
      <div className="mt-2 flex items-center gap-2 border-t border-outline-variant/10 pt-2">
        {!isGenerating && onModeChange && (
          <div role="group" aria-label="Build mode" className="flex rounded-full border border-outline-variant/30 overflow-hidden">
            {(["app", "flashcards"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-label={m === "app" ? "Switch to App mode" : "Switch to Flashcards mode"}
                onClick={() => onModeChange(m)}
                className={cn(
                  "px-2.5 py-0.5 text-xs font-medium transition-colors",
                  mode === m
                    ? "bg-primary text-white"
                    : "text-on-surface-variant hover:bg-surface-container-low",
                )}
              >
                {m === "app" ? "App" : "Flashcards"}
              </button>
            ))}
          </div>
        )}
        <VoiceInput
          onTranscript={(text) => onChange(value ? `${value} ${text}` : text)}
          disabled={isGenerating}
        />
        {showGuidedPill && (
          <button
            type="button"
            onClick={onGuidedClick}
            aria-label="Guided"
            className="flex items-center gap-1.5 rounded-full border border-outline-variant/40 px-3 py-1 text-xs text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            <span className="h-2 w-2 rounded-full bg-primary/60" />
            Guided
          </button>
        )}
        <div className="flex-1" />
        <span className="text-xs text-on-surface-variant/40">Bridges AI</span>
        <button
          type="submit"
          disabled={!value.trim() || isGenerating}
          aria-label="Send"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-container text-white shadow-sm transition-opacity disabled:opacity-40"
        >
          <MaterialIcon icon="arrow_upward" size="xs" />
        </button>
      </div>
    </form>
  );
}
