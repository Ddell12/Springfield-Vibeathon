"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { MaterialIcon } from "@/shared/components/material-icon";
import { SuggestionChips } from "@/shared/components/suggestion-chips";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { VoiceInput } from "@/shared/components/voice-input";
import { THERAPY_SUGGESTIONS } from "@/shared/lib/therapy-constants";

export function DashboardChatBox() {
  const [value, setValue] = useState("");
  const router = useRouter();

  const handleSubmit = () => {
    if (!value.trim()) return;
    router.push(`/builder?prompt=${encodeURIComponent(value.trim())}`);
  };

  const handleSuggestionSelect = (suggestion: string) => {
    router.push(`/builder?prompt=${encodeURIComponent(suggestion)}`);
  };

  return (
    <div className="relative mx-auto mb-8 w-full max-w-2xl">
      {/* Ambient glow */}
      <div className="absolute inset-0 rounded-2xl bg-primary-fixed opacity-10 blur-xl transition-opacity group-focus-within:opacity-20" />

      {/* Chat box card */}
      <div className="relative flex flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-[0_12px_32px_rgba(25,28,32,0.06)]">
        {/* Messages area */}
        <div className="flex flex-col gap-3 p-5 pb-3">
          {/* Welcome bubble */}
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-surface-container px-4 py-3">
              <p className="text-sm text-on-surface">
                Hi! Describe a therapy tool and I&apos;ll build it for you.
              </p>
            </div>
          </div>

          {/* Suggestion chips inside the chat area */}
          <SuggestionChips
            suggestions={THERAPY_SUGGESTIONS}
            onSelect={handleSuggestionSelect}
          />
        </div>

        {/* Input bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="bg-surface-container-low px-4 pt-3 pb-4"
        >
          <div className="flex items-center gap-2">
            <VoiceInput
              onTranscript={(text) =>
                setValue((prev) => (prev ? `${prev} ${text}` : text))
              }
            />
            <div className="relative flex-1">
              <MaterialIcon
                icon="chat"
                size="xs"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50"
              />
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Describe a therapy tool…"
                aria-label="Describe a therapy tool"
                autoComplete="off"
                className="pl-10"
              />
            </div>
            <Button
              type="submit"
              disabled={!value.trim()}
              size="icon"
              className="shrink-0 bg-gradient-to-br from-primary to-primary-container text-white hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
              aria-label="Start building"
            >
              <MaterialIcon icon="send" size="xs" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
