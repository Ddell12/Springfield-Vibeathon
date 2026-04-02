"use client";

import { useQuery } from "convex/react";

import { useEntitlements } from "@/core/hooks/use-entitlements";
import { cn } from "@/core/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

import { api } from "../../../../convex/_generated/api";

function getBarColor(percentage: number): string {
  if (percentage >= 100) return "bg-destructive";
  if (percentage >= 80) return "bg-caution";
  return "bg-primary";
}

function UsageBar({
  label,
  current,
  max,
}: {
  label: string;
  current: number;
  max: number;
}) {
  const isUnlimited = !isFinite(max);
  const percentage = isUnlimited ? 0 : Math.min((current / max) * 100, 100);
  const colorClass = getBarColor(percentage);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {current} {isUnlimited ? "(unlimited)" : `/ ${max}`}
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            colorClass,
          )}
          style={{ width: `${isUnlimited ? 0 : percentage}%` }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={`${label}: ${current} of ${isUnlimited ? "unlimited" : max}`}
        />
      </div>
    </div>
  );
}

export function UsageMeter() {
  const usage = useQuery(api.usage.getUsage);
  const { limits, isPremium, isLoading } = useEntitlements();

  if (isLoading || !usage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage This Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 rounded bg-muted" />
            <div className="h-8 rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Usage This Month</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <UsageBar
          label="Apps created"
          current={usage.appCount}
          max={limits.maxApps}
        />
        <UsageBar
          label="Generations"
          current={usage.generationCount}
          max={isPremium ? Infinity : 20}
        />
      </CardContent>
    </Card>
  );
}
