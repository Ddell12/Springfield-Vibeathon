import type { HistoryStat, ToolEvent } from "@/features/tools/lib/runtime/page-types";

export function matchingHistoryStats(events: ToolEvent[]): HistoryStat[] {
  const correct = events.filter((e) => e.eventType === "answer_correct").length;
  const incorrect = events.filter((e) => e.eventType === "answer_incorrect").length;
  const total = correct + incorrect;

  if (total === 0) return [];

  const accuracy = Math.round((correct / total) * 100);

  return [
    { label: "Accuracy", value: `${accuracy}%` },
    { label: "Attempts", value: total },
  ];
}
