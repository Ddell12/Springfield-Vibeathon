"use client";

import { useQuery } from "convex/react";
import { Copy, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { DuplicateToolDialog } from "@/features/tools/components/builder/duplicate-tool-dialog";
import { ProgressRail } from "@/features/tools/lib/runtime/premium-primitives";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type TimeFilter = "7d" | "30d" | "all";

interface ToolActivitySummaryProps {
  patientId: Id<"patients">;
}

function formatTemplateType(type: string): string {
  return type.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(timestamp));
}

const FILTER_MS: Record<TimeFilter, number> = {
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "all": Infinity,
};

const FILTER_LABELS: Record<TimeFilter, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "all": "All time",
};

export function ToolActivitySummary({ patientId }: ToolActivitySummaryProps) {
  const summary = useQuery(api.tools.getEventSummaryByPatient, { patientId });
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [duplicateState, setDuplicateState] = useState<{ open: boolean; appInstanceId: string | null }>({
    open: false, appInstanceId: null,
  });

  if (summary === undefined) {
    return (
      <div className="bg-surface-container-lowest rounded-xl p-4 flex flex-col gap-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (summary.length === 0) return null;

  const cutoff = timeFilter === "all" ? 0 : Date.now() - FILTER_MS[timeFilter];
  const filtered = summary.filter((item) =>
    timeFilter === "all" || (item.lastActivityAt !== null && item.lastActivityAt >= cutoff)
  );

  const maxCompletions = Math.max(...summary.map((s) => s.completions), 1);

  return (
    <div className="bg-surface-container-lowest rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-lg font-semibold">Tool Activity</h2>
        <div className="flex items-center gap-1">
          {(["7d", "30d", "all"] as TimeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setTimeFilter(f)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                timeFilter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity in this time period.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((item) => (
            <li key={item.appInstanceId} className="flex flex-col gap-2 rounded-lg bg-muted/40 px-3 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5 flex-1">
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
                    {item.lastActivityAt !== null && <> · Last: {formatDate(item.lastActivityAt)}</>}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    aria-label={`Duplicate ${item.title}`}
                    onClick={() => setDuplicateState({ open: true, appInstanceId: item.appInstanceId })}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  {item.shareToken && (
                    <Link href={`/apps/${item.shareToken}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground transition-colors hover:bg-accent"
                      aria-label={`Open ${item.title} in new tab`}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Completion rate bar */}
              {item.completions > 0 && (
                <ProgressRail current={item.completions} total={maxCompletions} />
              )}

              {/* Goal tag pills */}
              {item.goalTags && item.goalTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.goalTags.map((tag) => (
                    <span key={tag}
                      className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {duplicateState.appInstanceId && (
        <DuplicateToolDialog
          appInstanceId={duplicateState.appInstanceId as Id<"app_instances">}
          open={duplicateState.open}
          onOpenChange={(open) => setDuplicateState((prev) => ({ ...prev, open }))}
        />
      )}
    </div>
  );
}
