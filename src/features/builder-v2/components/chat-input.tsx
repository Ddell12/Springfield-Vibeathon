"use client";

import { useState } from "react";

import { cn } from "@/core/utils";

type ChatInputProps = {
  onSubmit: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
};

export function ChatInput({ onSubmit, isLoading, placeholder }: ChatInputProps) {
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
    </div>
  );
}
