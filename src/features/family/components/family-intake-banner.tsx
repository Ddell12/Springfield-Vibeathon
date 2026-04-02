"use client";

import Link from "next/link";

import { MaterialIcon } from "@/shared/components/material-icon";

interface RequiredFormProgress {
  signed: number;
  total: number;
  isComplete: boolean;
}

interface FamilyIntakeBannerProps {
  patientId: string;
  childName?: string;
  requiredFormProgress: RequiredFormProgress;
}

export function FamilyIntakeBanner({
  patientId,
  childName = "your child",
  requiredFormProgress,
}: FamilyIntakeBannerProps) {
  if (requiredFormProgress.isComplete) return null;

  return (
    <Link
      href={`/intake/${patientId}`}
      className="flex items-center gap-3 rounded-xl bg-caution/10 p-4 transition-colors hover:bg-caution/15"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-caution/20">
        <MaterialIcon icon="description" className="text-caution" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">
          Complete intake forms for {childName}
        </p>
        <p className="text-xs text-muted-foreground">
          {requiredFormProgress.signed} of {requiredFormProgress.total} required forms signed
        </p>
      </div>
      <MaterialIcon icon="chevron_right" className="text-muted-foreground" />
    </Link>
  );
}
