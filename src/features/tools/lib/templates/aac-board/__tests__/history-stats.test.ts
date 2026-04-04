import { describe, expect, it } from "vitest";

import { aacHistoryStats } from "../history-stats";
import type { ToolEvent } from "@/features/tools/lib/runtime/page-types";

function makeEvent(label: string, buttonId = "b1"): ToolEvent {
  return {
    _id: Math.random().toString(),
    _creationTime: Date.now(),
    appInstanceId: "app1",
    eventType: "item_tapped",
    eventPayloadJson: JSON.stringify({ buttonId, label }),
  };
}

describe("aacHistoryStats", () => {
  it("returns empty array when no item_tapped events", () => {
    const events: ToolEvent[] = [
      { _id: "1", _creationTime: 1, appInstanceId: "a", eventType: "app_opened" },
    ];
    expect(aacHistoryStats(events)).toEqual([]);
  });

  it("returns most-tapped word as first stat", () => {
    const events = [
      makeEvent("More", "b1"), makeEvent("More", "b1"), makeEvent("More", "b1"),
      makeEvent("Help", "b2"), makeEvent("Help", "b2"),
    ];
    const stats = aacHistoryStats(events);
    expect(stats[0].label).toBe("More");
    expect(stats[0].value).toBe(3);
  });

  it("returns top 5 words maximum", () => {
    const events = [
      makeEvent("A", "1"), makeEvent("A", "1"),
      makeEvent("B", "2"), makeEvent("B", "2"),
      makeEvent("C", "3"), makeEvent("C", "3"),
      makeEvent("D", "4"), makeEvent("D", "4"),
      makeEvent("E", "5"), makeEvent("E", "5"),
      makeEvent("F", "6"),
    ];
    const stats = aacHistoryStats(events);
    expect(stats.length).toBeLessThanOrEqual(5);
  });

  it("sorts by frequency descending", () => {
    const events = [
      makeEvent("Rare", "r"),
      makeEvent("Common", "c"), makeEvent("Common", "c"), makeEvent("Common", "c"),
    ];
    const stats = aacHistoryStats(events);
    expect(stats[0].label).toBe("Common");
    expect(Number(stats[0].value)).toBeGreaterThan(Number(stats[1]?.value ?? 0));
  });

  it("ignores events with malformed payloadJson", () => {
    const events: ToolEvent[] = [
      { _id: "bad", _creationTime: 1, appInstanceId: "a", eventType: "item_tapped", eventPayloadJson: "not-json" },
    ];
    expect(() => aacHistoryStats(events)).not.toThrow();
    expect(aacHistoryStats(events)).toEqual([]);
  });
});
