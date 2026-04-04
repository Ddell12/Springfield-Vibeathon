// src/features/tools/lib/templates/aac-board/history-stats.ts
import type { HistoryStat, ToolEvent } from "@/features/tools/lib/runtime/page-types";

export function aacHistoryStats(events: ToolEvent[]): HistoryStat[] {
  const counts = new Map<string, number>();

  for (const e of events) {
    if (e.eventType !== "item_tapped") continue;
    try {
      const payload = JSON.parse(e.eventPayloadJson ?? "{}") as { label?: string };
      const label = payload.label;
      if (typeof label === "string" && label.length > 0) {
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
    } catch {
      // malformed payload — skip
    }
  }

  return [...counts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([label, value]) => ({ label, value }));
}
