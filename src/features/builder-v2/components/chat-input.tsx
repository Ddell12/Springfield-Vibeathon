"use client";

import { useState } from "react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";

type ChatInputProps = {
  onSubmit: (message: string) => void;
  onStop?: () => void;
  isLoading: boolean;
  placeholder?: string;
};

export function ChatInput({ onSubmit, onStop, isLoading, placeholder }: ChatInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isDisabled = isLoading || !value.trim();

  return (
    <div className="flex gap-2 p-4 bg-surface-container-low">
      <textarea
        className={cn(
          "flex-1 resize-none rounded-xl bg-surface-container-lowest px-4 py-3",
          "text-on-surface placeholder:text-on-surface-variant",
          "focus:outline-none focus:ring-2 focus:ring-primary/30",
          "min-h-[44px] max-h-32"
        )}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Describe the therapy tool you want to build..."}
        disabled={isLoading}
        rows={1}
      />
      {isLoading ? (
        <button
          className={cn(
            "min-w-[44px] min-h-[44px] rounded-xl px-4 font-semibold text-sm transition-all duration-300",
            "bg-error/10 text-error border border-error/20",
            "hover:bg-error/20 active:scale-95"
          )}
          onClick={onStop}
          type="button"
          aria-label="Stop generation"
        >
          <MaterialIcon icon="stop_circle" size="sm" />
        </button>
      ) : (
        <button
          className={cn(
            "min-w-[44px] min-h-[44px] rounded-xl px-4 font-semibold text-sm transition-all duration-300",
            "bg-gradient-to-br from-primary to-primary-container text-white",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "hover:opacity-90 active:scale-95"
          )}
          onClick={handleSubmit}
          disabled={isDisabled}
          type="button"
        >
          Send
        </button>
      )}
    </div>
  );
}
