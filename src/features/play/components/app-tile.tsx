"use client";

import Link from "next/link";
import { cn } from "@/core/utils";

const TILE_COLORS = [
  "bg-teal-100 dark:bg-teal-900/30",
  "bg-sky-100 dark:bg-sky-900/30",
  "bg-amber-100 dark:bg-amber-900/30",
  "bg-rose-100 dark:bg-rose-900/30",
  "bg-violet-100 dark:bg-violet-900/30",
  "bg-emerald-100 dark:bg-emerald-900/30",
] as const;

const TILE_ICONS = ["🎯", "🧩", "🎨", "📚", "🎵", "⭐"] as const;

interface AppTileProps {
  appId: string;
  patientId: string;
  title: string;
  index: number;
  hasPracticeProgram: boolean;
}

export function AppTile({ appId, patientId, title, index, hasPracticeProgram }: AppTileProps) {
  const colorClass = TILE_COLORS[index % TILE_COLORS.length];
  const icon = TILE_ICONS[index % TILE_ICONS.length];

  return (
    <Link
      href={`/family/${patientId}/play/${appId}`}
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 rounded-2xl p-6",
        "min-h-[140px] min-w-[140px]",
        "transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        "active:scale-95 hover:scale-[1.02]",
        "shadow-sm hover:shadow-md",
        colorClass,
      )}
    >
      <span className="text-4xl" role="img" aria-hidden="true">{icon}</span>
      <span className="text-center text-sm font-semibold text-foreground line-clamp-2 font-headline">
        {title}
      </span>
      {hasPracticeProgram && (
        <span className="absolute top-2 right-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
          Practice today
        </span>
      )}
    </Link>
  );
}
