"use client";

import { Star } from "lucide-react";
import Link from "next/link";

import { ROUTES } from "@/core/routes";
import { cn } from "@/core/utils";

interface KidModeTileProps {
  patientId: string;
  appId: string;
  title: string;
  isPractice?: boolean;
}

const TILE_COLORS = [
  "bg-domain-blue-container text-on-domain-blue",
  "bg-domain-emerald-container text-on-domain-emerald",
  "bg-domain-purple-container text-on-domain-purple",
  "bg-domain-orange-container text-on-domain-orange",
  "bg-domain-pink-container text-on-domain-pink",
  "bg-domain-teal-container text-on-domain-teal",
  "bg-domain-amber-container text-on-domain-amber",
  "bg-domain-rose-container text-on-domain-rose",
];

function getColorForTitle(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TILE_COLORS[Math.abs(hash) % TILE_COLORS.length];
}

export function KidModeTile({ patientId, appId, title, isPractice }: KidModeTileProps) {
  const colorClass = getColorForTitle(title);
  const initial = title.charAt(0).toUpperCase();

  return (
    <Link
      href={ROUTES.FAMILY_PLAY_APP(patientId, appId)}
      className="group relative flex aspect-square flex-col items-center justify-center rounded-3xl p-4 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.03] active:scale-95"
    >
      <div className={cn("absolute inset-0 rounded-3xl", colorClass.split(" ")[0])} />

      <span
        className={cn(
          "relative z-10 text-6xl font-bold opacity-80",
          colorClass.split(" ")[1]
        )}
      >
        {initial}
      </span>

      <p className="relative z-10 mt-3 max-w-full truncate px-2 text-center text-base font-bold text-foreground">
        {title}
      </p>

      {isPractice && (
        <div className="absolute right-3 top-3 z-10 rounded-full bg-caution p-1.5 shadow-md">
          <Star className="h-4 w-4 fill-white text-white" />
        </div>
      )}
    </Link>
  );
}
