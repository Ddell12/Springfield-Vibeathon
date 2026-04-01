"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Skeleton } from "@/shared/components/ui/skeleton";

interface ToolActivitySummaryProps {
  patientId: Id<"patients">;
}

function formatTemplateType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(timestamp)
  );
}

export function ToolActivitySummary({ patientId }: ToolActivitySummaryProps) {
  const summary = useQuery(api.tools.getEventSummaryByPatient, { patientId });

  if (summary === undefined) {
    return (
      <div className="bg-surface-container-lowest rounded-xl p-4 flex flex-col gap-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (summary.length === 0) {
    return null;
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl p-4 flex flex-col gap-3">
      <h2 className="font-headline text-lg font-semibold">Tool Activity</h2>
      <ul className="flex flex-col gap-2">
        {summary.map((item) => (
          <li
            key={item.appInstanceId}
            className="flex items-start justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2.5"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm truncate">{item.title}</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {formatTemplateType(item.templateType)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {item.completions} completion{item.completions !== 1 ? "s" : ""}
                {" · "}
                {item.interactions} interaction{item.interactions !== 1 ? "s" : ""}
                {item.lastActivityAt !== null && (
                  <> · Last: {formatDate(item.lastActivityAt)}</>
                )}
              </p>
            </div>
            {item.shareToken && (
              <Link
                href={`/apps/${item.shareToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={`Open ${item.title} in new tab`}
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
