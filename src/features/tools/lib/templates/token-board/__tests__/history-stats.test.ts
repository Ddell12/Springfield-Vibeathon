import { describe, expect, it } from "vitest";

import { tokenHistoryStats } from "../history-stats";
import type { ToolEvent } from "@/features/tools/lib/runtime/page-types";

function makeTokenEvent(n: number): ToolEvent {
  return {
    _id: Math.random().toString(),
    _creationTime: Date.now(),
    appInstanceId: "app1",
    eventType: "token_added",
    eventPayloadJson: JSON.stringify({ tokenIndex: n - 1, earned: n }),
  };
}

function makeCompletedEvent(): ToolEvent {
  return {
    _id: Math.random().toString(),
    _creationTime: Date.now(),
    appInstanceId: "app1",
    eventType: "activity_completed",
    eventPayloadJson: JSON.stringify({ tokensEarned: 5 }),
  };
}

describe("tokenHistoryStats", () => {
  it("returns zero completions when no activity_completed events", () => {
    const stats = tokenHistoryStats([makeTokenEvent(1)]);
    const completionStat = stats.find((s) => s.label === "Completions");
    expect(Number(completionStat?.value ?? 0)).toBe(0);
  });

  it("counts activity_completed events as completions", () => {
    const events = [makeCompletedEvent(), makeCompletedEvent(), makeCompletedEvent()];
    const stats = tokenHistoryStats(events);
    const completionStat = stats.find((s) => s.label === "Completions");
    expect(Number(completionStat?.value)).toBe(3);
  });

  it("counts total tokens added", () => {
    const events = [makeTokenEvent(1), makeTokenEvent(2), makeTokenEvent(3)];
    const stats = tokenHistoryStats(events);
    const tokenStat = stats.find((s) => s.label === "Tokens Earned");
    expect(Number(tokenStat?.value)).toBe(3);
  });

  it("returns empty array when no relevant events", () => {
    const events: ToolEvent[] = [
      { _id: "1", _creationTime: 1, appInstanceId: "a", eventType: "app_opened" },
    ];
    const stats = tokenHistoryStats(events);
    expect(stats.length).toBeGreaterThan(0);
  });
});
