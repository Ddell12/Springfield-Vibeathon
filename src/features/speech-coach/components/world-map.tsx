"use client";

import { useQuery } from "convex/react";
import Link from "next/link";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type Props = {
  patientId: Id<"patients">;
};

const TIER_ORDER = ["word", "phrase", "sentence"] as const;

const THEME_EMOJI: Record<string, string> = {
  dinosaurs: "🦕",
  ocean: "🐠",
  space: "🚀",
  safari: "🦁",
  fairy: "🧚",
  farm: "🐑",
  pirates: "🏴‍☠️",
  superheroes: "🦸",
  arctic: "🐧",
  trains: "🚂",
};

const THEME_NAMES: Record<string, string> = {
  dinosaurs: "Dino Valley",
  ocean: "Ocean Reef",
  space: "Star Station",
  safari: "Safari Land",
  fairy: "Fairy Forest",
  farm: "Farm Friends",
  pirates: "Pirate Cove",
  superheroes: "Super City",
  arctic: "Arctic Expedition",
  trains: "Train Town",
};

type TierState = "locked" | "in_progress" | "mastered";

function getTierState(masteryPct: number, attemptCount: number, unlockedAt?: number): TierState {
  if (unlockedAt != null || (masteryPct >= 0.8 && attemptCount >= 10)) return "mastered";
  if (attemptCount > 0) return "in_progress";
  return "locked";
}

export function WorldMap({ patientId }: Props) {
  const themes = useQuery(api.adventure_words.listThemes);
  // Load progress for all themes
  const allProgress = useQuery(api.adventure_progress.getProgress, { patientId });

  if (!themes || !allProgress) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Group progress by themeSlug
  const progressByTheme = new Map<string, typeof allProgress>();
  for (const row of allProgress) {
    const existing = progressByTheme.get(row.themeSlug) ?? [];
    existing.push(row);
    progressByTheme.set(row.themeSlug, existing);
  }

  // Only show themes that have any progress
  const activeThemes = themes.filter((t) => (progressByTheme.get(t.slug)?.length ?? 0) > 0);

  if (activeThemes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center px-6">
        <p className="text-4xl" aria-hidden="true">🗺️</p>
        <h2 className="font-headline text-xl font-bold text-foreground">No adventures yet</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Start an Adventure Mode session to see your world map grow here.
        </p>
        <Button asChild size="sm">
          <Link href="..">Start an adventure</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold text-on-surface">World Map</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Your adventure progress across all worlds.
        </p>
      </div>

      {activeThemes.map((theme) => {
        const themeProgress = progressByTheme.get(theme.slug) ?? [];
        const emoji = THEME_EMOJI[theme.slug] ?? "🌟";
        const name = THEME_NAMES[theme.slug] ?? theme.name;

        // Group by targetSound
        const soundSet = new Set(themeProgress.map((p) => p.targetSound));

        return (
          <div key={theme.slug} className="rounded-3xl bg-surface-container-lowest p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl" aria-hidden="true">{emoji}</span>
              <h2 className="font-headline text-lg font-semibold text-on-surface">{name}</h2>
            </div>

            <div className="flex flex-col gap-4">
              {Array.from(soundSet).map((targetSound) => {
                const soundProgress = themeProgress.filter((p) => p.targetSound === targetSound);

                return (
                  <div key={targetSound}>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                      {targetSound}
                    </p>
                    <div className="flex items-center gap-2">
                      {TIER_ORDER.map((tier, idx) => {
                        const row = soundProgress.find((p) => p.tier === tier);
                        const state: TierState = row
                          ? getTierState(row.masteryPct, row.attemptCount, row.unlockedAt)
                          : "locked";

                        // Only show tier if previous tier is mastered (or it's the first tier)
                        const prevTier = TIER_ORDER[idx - 1];
                        const prevRow = prevTier ? soundProgress.find((p) => p.tier === prevTier) : null;
                        const isAccessible =
                          idx === 0 ||
                          (prevRow != null &&
                            getTierState(prevRow.masteryPct, prevRow.attemptCount, prevRow.unlockedAt) === "mastered");

                        return (
                          <div key={tier} className="flex items-center gap-2">
                            {idx > 0 && (
                              <span
                                aria-hidden="true"
                                className={cn(
                                  "h-px w-4 flex-shrink-0",
                                  state !== "locked" ? "bg-primary/40" : "bg-muted"
                                )}
                              />
                            )}
                            <TierNode
                              tier={tier}
                              state={isAccessible ? state : "locked"}
                              masteryPct={row?.masteryPct}
                              patientId={patientId}
                              themeSlug={theme.slug}
                              targetSound={targetSound}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TierNode({
  tier,
  state,
  masteryPct,
}: {
  tier: string;
  state: TierState;
  masteryPct?: number;
  patientId: Id<"patients">;
  themeSlug: string;
  targetSound: string;
}) {
  const label = tier.charAt(0).toUpperCase() + tier.slice(1);

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        aria-label={`${label}: ${state}`}
        className={cn(
          "h-12 w-12 rounded-full flex items-center justify-center text-lg font-semibold transition-all",
          state === "mastered" && "bg-primary text-primary-foreground shadow-md shadow-primary/30",
          state === "in_progress" && "bg-primary/20 text-primary ring-2 ring-primary ring-offset-1 animate-pulse",
          state === "locked" && "bg-muted text-muted-foreground opacity-50"
        )}
      >
        {state === "mastered" ? "⭐" : state === "in_progress" ? label[0] : "🔒"}
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
      {state !== "locked" && masteryPct != null && (
        <span className="text-[10px] font-medium text-primary">
          {Math.round(masteryPct * 100)}%
        </span>
      )}
    </div>
  );
}
