"use client";

import { useQuery } from "convex/react";

import { cn } from "@/core/utils";

import { api } from "../../../../convex/_generated/api";

type Props = {
  selectedSlug: string | null;
  ageRange: "2-4" | "5-7";
  onSelect: (slug: string) => void;
};

// Palette of warm tonal backgrounds for theme tiles (no image art until seeded)
const THEME_PALETTE: Record<string, string> = {
  dinosaurs: "from-green-800 to-emerald-600",
  ocean: "from-blue-600 to-cyan-400",
  space: "from-indigo-900 to-violet-700",
  safari: "from-amber-600 to-yellow-400",
  fairy: "from-pink-500 to-purple-400",
  farm: "from-lime-600 to-yellow-500",
  pirates: "from-blue-800 to-teal-600",
  superheroes: "from-red-600 to-orange-400",
  arctic: "from-sky-300 to-blue-200",
  trains: "from-orange-600 to-red-400",
};

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

export function ThemePicker({ selectedSlug, ageRange, onSelect }: Props) {
  const themes = useQuery(api.adventure_words.listThemes);

  if (!themes) {
    return (
      <div className="flex justify-center py-4">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const filtered = themes.filter((t) => t.ageRanges.includes(ageRange));

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3">
        Pick a world for your adventure
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {filtered.map((theme) => {
          const gradient = THEME_PALETTE[theme.slug] ?? "from-primary to-primary/60";
          const emoji = THEME_EMOJI[theme.slug] ?? "🌟";
          const isSelected = selectedSlug === theme.slug;

          return (
            <button
              key={theme.slug}
              type="button"
              onClick={() => onSelect(theme.slug)}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-2xl p-3 text-white transition-all duration-300",
                `bg-gradient-to-br ${gradient}`,
                isSelected
                  ? "ring-2 ring-offset-2 ring-primary scale-105 shadow-lg"
                  : "opacity-80 hover:opacity-100 hover:scale-102"
              )}
            >
              <span className="text-2xl" aria-hidden="true">{emoji}</span>
              <span className="mt-1 text-xs font-semibold leading-tight text-center">
                {theme.name}
              </span>
              {isSelected && (
                <span
                  aria-hidden="true"
                  className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground shadow"
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
