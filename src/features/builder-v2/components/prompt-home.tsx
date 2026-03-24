"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { cn } from "@/core/utils";

type TemplateCard = {
  icon: string;
  name: string;
  description: string;
  prompt: string;
};

const TEMPLATE_CARDS: TemplateCard[] = [
  {
    icon: "⭐",
    name: "Token Board",
    description: "Motivate with star rewards",
    prompt:
      "Build a 5-star token board for a child who earns stars for completing tasks. Show stars that light up as they're earned, with a celebration animation when all 5 are filled. Include a reset button for the next session.",
  },
  {
    icon: "📅",
    name: "Visual Schedule",
    description: "Morning routine step-by-step",
    prompt:
      "Create a morning routine visual schedule with picture cards for each step: wake up, brush teeth, get dressed, eat breakfast, and pack backpack. Each card should be large and tappable so the child can mark it done. Include simple icons and short text labels.",
  },
  {
    icon: "💬",
    name: "Communication Board",
    description: "Request snacks and needs",
    prompt:
      "Build a snack request communication board with picture symbols for common snack choices like apple, crackers, juice, and cheese. Tapping a symbol should display the word clearly and play a visual highlight. Include a 'more' button and a 'no thank you' button.",
  },
  {
    icon: "✅",
    name: "Choice Board",
    description: "Pick between two options",
    prompt:
      "Make a choice board that lets a child pick between two activity options. Show two large picture cards side by side. When a card is tapped, it should grow and highlight to confirm the selection. Let the therapist customize what the two choices are.",
  },
];

type PromptHomeProps = {
  onSubmit: (message: string) => void;
};

export function PromptHome({ onSubmit }: PromptHomeProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCardClick = (prompt: string) => {
    onSubmit(prompt);
  };

  const isDisabled = !value.trim();

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center min-h-full w-full px-4 py-12",
        "bg-gradient-to-br from-primary/[0.03] via-surface to-secondary/[0.03]"
      )}
    >
      {/* Centered content column */}
      <div className="w-full max-w-[700px] flex flex-col gap-8">
        {/* Greeting */}
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-3xl md:text-4xl font-bold font-headline text-on-surface tracking-tight">
            What does your child need today?
          </h1>
          <p className="text-base text-on-surface-variant font-body">
            Describe the therapy tool and Bridges will build it in seconds.
          </p>
        </div>

        {/* Main input card */}
        <div className="flex flex-col gap-3 p-3 bg-surface-container-lowest rounded-2xl sanctuary-shadow">
          <textarea
            ref={textareaRef}
            className={cn(
              "w-full resize-none bg-transparent px-3 pt-3 pb-1",
              "text-[15px] text-foreground placeholder:text-muted",
              "focus:outline-none leading-relaxed font-body min-h-[100px]"
            )}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the therapy tool you need — a morning routine, token board, communication board..."
            rows={4}
            aria-label="Describe your therapy tool"
          />

          {/* Action bar */}
          <div className="flex items-center justify-between px-1 pb-1">
            {/* Templates link */}
            <Link
              href="/templates"
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg",
                "text-sm font-medium text-on-surface-variant",
                "hover:bg-surface-container hover:text-on-surface transition-colors"
              )}
            >
              <span>Templates</span>
              <span className="text-xs opacity-60">↗</span>
            </Link>

            {/* Send button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isDisabled}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-xl",
                "text-sm font-semibold text-on-primary bg-primary-gradient",
                "transition-all duration-300",
                isDisabled
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:opacity-90 hover:shadow-md active:scale-95"
              )}
              aria-label="Send prompt"
            >
              Build it
              <span className="text-base leading-none">→</span>
            </button>
          </div>
        </div>

        {/* Template quick-start cards */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium text-on-surface-variant text-center uppercase tracking-wider">
            Quick start
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0 md:grid md:grid-cols-4 snap-x snap-mandatory">
            {TEMPLATE_CARDS.map((card) => (
              <button
                key={card.name}
                type="button"
                onClick={() => handleCardClick(card.prompt)}
                className={cn(
                  "flex flex-col gap-2 p-4 rounded-2xl text-left snap-start shrink-0 w-[160px] md:w-auto",
                  "bg-surface-container-lowest sanctuary-shadow",
                  "hover:bg-surface-container-low hover:shadow-md",
                  "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-95",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                )}
                aria-label={`Start with ${card.name}: ${card.description}`}
              >
                <span className="text-2xl leading-none" role="img" aria-hidden>
                  {card.icon}
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-on-surface font-headline">
                    {card.name}
                  </span>
                  <span className="text-xs text-on-surface-variant leading-snug line-clamp-2">
                    {card.description}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
