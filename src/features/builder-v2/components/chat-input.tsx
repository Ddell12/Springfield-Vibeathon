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
    <div className="flex flex-col gap-2 p-4 mt-auto">
      {/* Optional Notification Toast */}
      {/*
      <div className="flex items-center justify-between p-3 bg-surface-container-lowest border border-surface-container rounded-xl shadow-sm mb-2">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-foreground">Enable notifications</span>
          <span className="text-xs text-muted">Get notified when Bridges completes a task.</span>
        </div>
        <div className="flex gap-2">
          <button className="text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-surface-container-low transition-colors text-muted">Later</button>
          <button className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">Enable</button>
        </div>
      </div>
      */}

      <div className="relative flex flex-col gap-2 p-2 bg-surface-container-lowest border border-surface-container shadow-sm rounded-2xl transition-all focus-within:shadow-md focus-within:border-primary/30">
        <textarea
          className={cn(
            "w-full resize-none bg-transparent px-3 py-2",
            "text-[15px] text-foreground placeholder:text-muted",
            "focus:outline-none min-h-[40px] max-h-32 leading-relaxed"
          )}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "Ask Bridges..."}
          disabled={isLoading}
          rows={1}
        />
        
        <div className="flex items-center justify-between px-1">
          {/* Left: Plus icon + Visual Edits */}
          <div className="flex items-center gap-2">
            <button className="w-7 h-7 rounded-full flex items-center justify-center text-muted hover:bg-surface-container hover:text-foreground transition-colors group">
              <span className="text-lg leading-none">+</span>
            </button>
            <button className="flex items-center gap-1.5 px-2.5 h-7 rounded-md hover:bg-surface-container-low text-xs font-medium text-muted hover:text-foreground transition-colors">
              <MaterialIcon icon="visibility" size="sm" />
              <span>Visual edits</span>
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5">
            <button className="flex items-center gap-1.5 px-2.5 h-7 rounded-md hover:bg-surface-container-low text-xs font-medium text-muted hover:text-foreground transition-colors hidden sm:flex">
              <MaterialIcon icon="chat" size="sm" />
              <span>Chat</span>
            </button>
            
            <button className="w-7 h-7 rounded-full flex items-center justify-center text-muted hover:bg-surface-container hover:text-foreground transition-colors">
              <MaterialIcon icon="mic" size="sm" />
            </button>
            
            {isLoading ? (
              <button
                className="w-7 h-7 rounded-full flex items-center justify-center bg-foreground text-background hover:opacity-80 transition-opacity"
                onClick={onStop}
                type="button"
              >
                <span className="w-2.5 h-2.5 rounded-sm bg-background" />
              </button>
            ) : (
              <button
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center bg-foreground text-background transition-opacity",
                  isDisabled ? "opacity-30 cursor-not-allowed" : "hover:opacity-80"
                )}
                onClick={handleSubmit}
                disabled={isDisabled}
                type="button"
              >
                <MaterialIcon icon="arrow_upward" size="sm" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
