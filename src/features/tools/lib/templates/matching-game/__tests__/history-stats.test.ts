import { describe, expect, it } from "vitest";

import { matchingHistoryStats } from "../history-stats";
import type { ToolEvent } from "@/features/tools/lib/runtime/page-types";

function correctEvent(prompt: string): ToolEvent {
  return {
    _id: Math.random().toString(),
    _creationTime: Date.now(),
    appInstanceId: "app1",
    eventType: "answer_correct",
    eventPayloadJson: JSON.stringify({ prompt }),
  };
}

function incorrectEvent(prompt: string): ToolEvent {
  return {
    _id: Math.random().toString(),
    _creationTime: Date.now(),
    appInstanceId: "app1",
    eventType: "answer_incorrect",
    eventPayloadJson: JSON.stringify({ prompt }),
  };
}

describe("matchingHistoryStats", () => {
  it("returns empty array when no answer events", () => {
    const events: ToolEvent[] = [
      { _id: "1", _creationTime: 1, appInstanceId: "a", eventType: "app_opened" },
    ];
    expect(matchingHistoryStats(events)).toEqual([]);
  });

  it("returns overall accuracy stat", () => {
    const events = [
      correctEvent("Dog"),
      correctEvent("Dog"),
      incorrectEvent("Dog"),
    ];
    const stats = matchingHistoryStats(events);
    const accuracy = stats.find((s) => s.label === "Accuracy");
    expect(accuracy?.value).toBe("67%");
  });

  it("returns 100% accuracy when all correct", () => {
    const events = [correctEvent("Cat"), correctEvent("Dog")];
    const stats = matchingHistoryStats(events);
    const accuracy = stats.find((s) => s.label === "Accuracy");
    expect(accuracy?.value).toBe("100%");
  });

  it("returns total attempts stat", () => {
    const events = [correctEvent("A"), incorrectEvent("A"), correctEvent("B")];
    const stats = matchingHistoryStats(events);
    const attempts = stats.find((s) => s.label === "Attempts");
    expect(Number(attempts?.value)).toBe(3);
  });
});
