"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/core/utils";
import { getCelebrationMessage, type CelebrationTrigger } from "../lib/encouragement";

interface CelebrationCardProps {
  childName: string;
  currentStreak: number;
  goals?: Array<{ status: string; shortDescription: string }>;
}

interface ActiveCelebration {
  trigger: CelebrationTrigger;
  storageKey: string;
  message: string;
}

const STREAK_MILESTONES = [3, 7, 14, 30];

function buildCelebrations(
  childName: string,
  currentStreak: number,
  goals?: Array<{ status: string; shortDescription: string }>
): ActiveCelebration[] {
  const results: ActiveCelebration[] = [];

  // Check streak milestones
  for (const milestone of STREAK_MILESTONES) {
    if (currentStreak >= milestone) {
      const trigger: CelebrationTrigger = { type: "streak", value: milestone };
      const message = getCelebrationMessage(trigger, childName);
      if (message) {
        results.push({
          trigger,
          storageKey: `celebration-streak-${milestone}`,
          message,
        });
      }
    }
  }

  // Check for met goals
  if (goals) {
    for (const goal of goals) {
      if (goal.status === "met") {
        const trigger: CelebrationTrigger = {
          type: "goal-met",
          goalDescription: goal.shortDescription,
        };
        const message = getCelebrationMessage(trigger, childName);
        if (message) {
          const key = `celebration-goal-met-${goal.shortDescription.slice(0, 40).replace(/\s+/g, "-")}`;
          results.push({ trigger, storageKey: key, message });
        }
      }
    }
  }

  return results;
}

export function CelebrationCard({ childName, currentStreak, goals }: CelebrationCardProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  // Read localStorage after hydration to avoid SSR mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const allCelebrations = buildCelebrations(childName, currentStreak, goals);

  const visible = mounted
    ? allCelebrations.filter((c) => {
        if (dismissed.has(c.storageKey)) return false;
        try {
          return !localStorage.getItem(c.storageKey);
        } catch {
          return true;
        }
      })
    : [];

  function dismiss(storageKey: string) {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      // localStorage may be unavailable
    }
    setDismissed((prev) => new Set(prev).add(storageKey));
  }

  if (visible.length === 0) return null;

  // Show the most significant celebration only (last in list = highest milestone)
  const celebration = visible[visible.length - 1];

  return (
    <div
      className={cn(
        "relative rounded-xl bg-amber-50 p-4 shadow-sm",
        "border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
      )}
      role="status"
      aria-live="polite"
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-7 w-7 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/50"
        onClick={() => dismiss(celebration.storageKey)}
        aria-label="Dismiss celebration"
      >
        <X className="h-4 w-4" />
      </Button>
      <p className="pr-8 text-sm font-medium leading-relaxed text-amber-900 dark:text-amber-100">
        {celebration.message}
      </p>
    </div>
  );
}
