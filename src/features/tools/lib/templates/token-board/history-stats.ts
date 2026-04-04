import type { HistoryStat, ToolEvent } from "@/features/tools/lib/runtime/page-types";

export function tokenHistoryStats(events: ToolEvent[]): HistoryStat[] {
  const completions = events.filter((e) => e.eventType === "activity_completed").length;
  const tokensEarned = events.filter((e) => e.eventType === "token_added").length;

  return [
    { label: "Completions", value: completions },
    { label: "Tokens Earned", value: tokensEarned },
  ];
}
