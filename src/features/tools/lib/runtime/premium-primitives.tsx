"use client";

import type { ReactNode } from "react";

import { cn } from "@/core/utils";

/**
 * Shared screen wrapper with a warm title block.
 * Uses Fraunces (font-headline) for the title per DESIGN.md.
 */
export function PremiumScreen({
  title,
  eyebrow,
  children,
  className,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-col gap-1">
        {eyebrow && (
          <p className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1 className="font-headline text-2xl font-semibold text-foreground">
          {title}
        </h1>
      </div>
      {children}
    </div>
  );
}

/**
 * Linear progress bar using tonal surface colors (no border).
 * Uses bg-surface-container for the track — tonal shift, not a border line.
 */
export function ProgressRail({
  current,
  total,
  label,
}: {
  current: number;
  total: number;
  label?: string;
}) {
  const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <p className="text-xs text-muted-foreground">{label}</p>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-[var(--ease-sanctuary)]"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={total}
        />
      </div>
    </div>
  );
}

/**
 * Completion / reinforcement surface.
 * Tonal background, no loud borders. Fraunces for the title.
 */
export function ReinforcementBanner({
  title,
  body,
  className,
}: {
  title: string;
  body?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl bg-surface-container-high px-6 py-5 text-center",
        className
      )}
    >
      <p className="font-headline text-xl font-semibold text-foreground">
        {title}
      </p>
      {body && (
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      )}
    </div>
  );
}

/**
 * Raised prompt panel for instructions or questions.
 * Uses subtle tonal lift (no border).
 * Reserved for future use in session-prompt templates.
 */
export function PromptSurface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl bg-surface-container px-5 py-4",
        className
      )}
    >
      {children}
    </div>
  );
}
