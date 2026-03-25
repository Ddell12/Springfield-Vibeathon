"use client";

import Link from "next/link";

import { cn } from "@/core/utils";

const TEMPLATES = [
  {
    id: "token-board",
    title: "Token Board",
    subtitle: "Reward system with customizable tokens and goals",
    gradient: "from-amber-400/30 to-orange-300/20",
    emoji: "star",
  },
  {
    id: "visual-schedule",
    title: "Visual Schedule",
    subtitle: "Step-by-step daily routine with drag-to-reorder",
    gradient: "from-sky-400/30 to-blue-300/20",
    emoji: "calendar",
  },
  {
    id: "communication-board",
    title: "Communication Board",
    subtitle: "AAC grid with picture cards and text-to-speech",
    gradient: "from-emerald-400/30 to-teal-300/20",
    emoji: "chat",
  },
  {
    id: "social-story",
    title: "Social Story",
    subtitle: "Illustrated narrative for social situations",
    gradient: "from-violet-400/30 to-purple-300/20",
    emoji: "book",
  },
  {
    id: "feelings-check-in",
    title: "Feelings Check-In",
    subtitle: "Emotion identification with visual supports",
    gradient: "from-rose-400/30 to-pink-300/20",
    emoji: "heart",
  },
  {
    id: "first-then-board",
    title: "First-Then Board",
    subtitle: "Simple contingency board for transitions",
    gradient: "from-lime-400/30 to-green-300/20",
    emoji: "arrow",
  },
];

const EMOJI_MAP: Record<string, string> = {
  star: "\u2B50",
  calendar: "\uD83D\uDCC5",
  chat: "\uD83D\uDCAC",
  book: "\uD83D\uDCD6",
  heart: "\u2764\uFE0F",
  arrow: "\u27A1\uFE0F",
};

export function TemplatesTab() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {TEMPLATES.map((template) => (
        <Link
          key={template.id}
          href={`/builder?template=${template.id}`}
          className="group flex flex-col rounded-xl bg-surface-container-lowest overflow-hidden transition-shadow duration-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
        >
          <div
            className={cn(
              "aspect-[16/10] w-full bg-gradient-to-br flex items-center justify-center",
              template.gradient
            )}
          >
            <span className="text-5xl opacity-60 group-hover:opacity-80 transition-opacity group-hover:scale-110 transition-transform duration-300">
              {EMOJI_MAP[template.emoji] ?? ""}
            </span>
          </div>
          <div className="flex flex-col gap-1 p-4">
            <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              {template.title}
            </h3>
            <p className="text-xs text-muted line-clamp-2">{template.subtitle}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
