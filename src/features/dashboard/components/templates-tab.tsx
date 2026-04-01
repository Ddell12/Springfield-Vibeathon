"use client";

import Link from "next/link";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";

const TEMPLATES = [
  {
    id: "token-board",
    title: "Token Board",
    subtitle: "Reward system with customizable tokens and goals",
    previewTone: "bg-caution-container text-caution",
    icon: "stars",
  },
  {
    id: "visual-schedule",
    title: "Visual Schedule",
    subtitle: "Step-by-step daily routine with drag-to-reorder",
    previewTone: "bg-primary-fixed text-primary",
    icon: "calendar_month",
  },
  {
    id: "communication-board",
    title: "Communication Board",
    subtitle: "AAC grid with picture cards and text-to-speech",
    previewTone: "bg-success-container text-success",
    icon: "chat",
  },
  {
    id: "social-story",
    title: "Social Story",
    subtitle: "Illustrated narrative for social situations",
    previewTone: "bg-surface-container-high text-on-surface",
    icon: "book_2",
  },
  {
    id: "feelings-check-in",
    title: "Feelings Check-In",
    subtitle: "Emotion identification with visual supports",
    previewTone: "bg-error-container text-error",
    icon: "favorite",
  },
  {
    id: "first-then-board",
    title: "First-Then Board",
    subtitle: "Simple contingency board for transitions",
    previewTone: "bg-secondary-container text-on-surface",
    icon: "arrow_forward",
  },
];

export function TemplatesTab() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {TEMPLATES.map((template) => (
        <Link
          key={template.id}
          href={`/builder?prompt=${encodeURIComponent(`Build me a ${template.title}: ${template.subtitle}`)}`}
          className="group flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest ring-1 ring-outline-variant/20 transition-shadow duration-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
        >
          <div
            className={cn(
              "flex aspect-[16/10] w-full items-end justify-between p-4",
              template.previewTone
            )}
          >
            <div className="rounded-lg bg-surface/80 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-on-surface shadow-sm">
              Template
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface/80 text-on-surface shadow-sm transition-transform duration-300 group-hover:-translate-y-0.5">
              <MaterialIcon icon={template.icon} size="sm" />
            </div>
          </div>
          <div className="flex flex-col gap-1 p-4">
            <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
              {template.title}
            </h3>
            <p className="text-xs text-muted line-clamp-2">{template.subtitle}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
