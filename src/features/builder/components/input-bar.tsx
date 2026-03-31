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
}

export function InputBar({
  value,
  onChange,
  onSubmit,
  placeholder = "What would you like to build?",
  isGenerating,
  className,
  showGuidedPill,
  onGuidedClick,
}: InputBarProps) {
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
        placeholder={placeholder}
        disabled={isGenerating}
        rows={1}
        aria-label={placeholder}
        className="w-full resize-none overflow-hidden border-0 bg-transparent text-sm outline-none placeholder:text-on-surface-variant/40 disabled:opacity-60 min-h-[24px] max-h-[200px]"
      />
      <div className="mt-2 flex items-center gap-2 border-t border-outline-variant/10 pt-2">
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
