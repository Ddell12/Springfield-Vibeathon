"use client";

import { format } from "date-fns";
import { Activity, Calendar, Clock } from "lucide-react";

import type { HistoryStat, TemplateDataStore, ToolEvent } from "./page-types";

interface HistoryPageProps {
  data: TemplateDataStore;
  historyStats?: (events: ToolEvent[]) => HistoryStat[];
}

export function HistoryPage({ data, historyStats }: HistoryPageProps) {
  const { events, sessionCount, lastUsedAt } = data.history;
  const templateStats = historyStats ? historyStats(events) : [];

  return (
    <div className="flex flex-col gap-6 overflow-y-auto p-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Sessions"
          value={sessionCount}
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          label="Last used"
          value={lastUsedAt ? format(new Date(lastUsedAt), "MMM d") : "Never"}
          icon={<Calendar className="h-4 w-4" />}
        />
      </div>

      {/* Template-specific stats */}
      {templateStats.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="font-headline text-sm font-semibold text-foreground">
            Activity Summary
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {templateStats.map((s) => (
              <StatCard key={s.label} label={s.label} value={s.value} />
            ))}
          </div>
        </section>
      )}

      {/* Recent event timeline — last 20 */}
      <section className="flex flex-col gap-2">
        <h3 className="font-headline text-sm font-semibold text-foreground">
          Recent Events
        </h3>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No events recorded yet. Use the tool to start tracking activity.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {[...events]
              .sort((a, b) => b._creationTime - a._creationTime)
              .slice(0, 20)
              .map((e) => (
                <div
                  key={e._id}
                  className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2 text-xs"
                >
                  <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {format(new Date(e._creationTime), "MMM d h:mm a")}
                  </span>
                  <span className="font-medium text-foreground">
                    {e.eventType.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className="font-headline text-2xl font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}
