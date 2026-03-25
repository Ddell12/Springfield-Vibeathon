"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function MainPromptInput() {
  const [value, setValue] = useState("");
  const router = useRouter();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!value.trim()) return;
    router.push(`/builder?prompt=${encodeURIComponent(value)}`);
  };

  return (
    <div className="relative mx-auto mb-8 w-full max-w-2xl group">
      {/* Ambient glow */}
      <div className="absolute inset-0 rounded-3xl bg-primary-fixed opacity-10 blur-xl transition-opacity group-focus-within:opacity-20" />

      {/* Input container */}
      <div className="relative flex items-center rounded-3xl bg-surface-container-lowest p-2 pl-6 shadow-[0_12px_32px_rgba(25,28,32,0.06)] ring-1 ring-outline-variant/10 transition-all focus-within:ring-primary/40">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe a therapy tool..."
          className="flex-1 border-none bg-transparent py-3 font-body text-lg text-on-surface placeholder:text-outline focus:outline-none focus:ring-0"
        />
        <button
          onClick={handleSubmit}
          disabled={!value.trim()}
          className="ml-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-container text-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
        >
          <Send size={20} fill="currentColor" />
        </button>
      </div>
    </div>
  );
}
