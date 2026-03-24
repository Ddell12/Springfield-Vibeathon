"use client";

import { ArrowUp, MessageSquare,Mic, Paperclip, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function MainPromptInput() {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!value.trim()) return;
    // Redirect to the builder with the prompt
    router.push(`/builder?prompt=${encodeURIComponent(value)}`);
  };

  return (
    <div className="w-full max-w-3xl mx-auto relative group">
      <div className="absolute inset-0 -mx-1 -my-1 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative bg-[#fafafa]/95 backdrop-blur-xl border border-surface-container shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-4 flex flex-col gap-3 transition-all hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)]">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Ask Bridges to create a tool for my..."
          className="w-full bg-transparent text-foreground placeholder-muted focus:outline-none resize-none px-2 py-1 text-lg leading-relaxed min-h-[56px] overflow-hidden"
          rows={1}
        />
        
        <div className="flex items-center justify-between pt-2">
          {/* Left Actions */}
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-high text-muted hover:text-foreground transition-colors">
              <Plus size={18} />
            </button>
            <button className="flex items-center gap-1.5 px-3 h-8 rounded-full border border-surface-container hover:bg-surface-container-low text-xs font-medium text-muted hover:text-foreground transition-colors">
              <Paperclip size={14} />
              <span>Attach</span>
            </button>
            <button className="flex items-center gap-1.5 px-3 h-8 rounded-full border border-surface-container hover:bg-surface-container-low text-xs font-medium text-muted hover:text-foreground transition-colors">
              <span className="w-3 h-3 rounded-full bg-primary/20" />
              <span>Theme</span>
            </button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 h-8 rounded-full hover:bg-surface-container-high text-xs font-medium text-muted hover:text-foreground transition-colors">
              <MessageSquare size={14} />
              <span>Chat</span>
            </button>
            <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-high text-muted hover:text-foreground transition-colors">
              <Mic size={16} />
            </button>
            <button 
              onClick={handleSubmit}
              disabled={!value.trim()}
              className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
