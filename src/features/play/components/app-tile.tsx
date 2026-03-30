"use client";

import Link from "next/link";
import { cn } from "@/core/utils";

const TILE_COLORS = [
  "bg-domain-teal-container",
  "bg-domain-blue-container",
  "bg-domain-amber-container",
  "bg-domain-rose-container",
  "bg-domain-purple-container",
  "bg-domain-emerald-container",
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
      <span className="text-center text-sm font-semibold text-foreground line-clamp-2">
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
