import { describe, expect, it } from "vitest";

import { type CelebrationTrigger,getCelebrationMessage } from "../encouragement";

describe("getCelebrationMessage", () => {
  it("streak 3 message", () => {
    const msg = getCelebrationMessage({ type: "streak", value: 3 }, "Alex");
    expect(msg).toContain("3-day streak");
  });
  it("streak 7 message", () => {
    const msg = getCelebrationMessage({ type: "streak", value: 7 }, "Alex");
    expect(msg).toContain("week");
  });
  it("weekly-complete message", () => {
    const msg = getCelebrationMessage({ type: "weekly-complete" }, "Alex");
    expect(msg).toContain("complete");
  });
  it("goal-met message", () => {
    const msg = getCelebrationMessage({ type: "goal-met", goalDescription: "/r/ sounds" }, "Alex");
    expect(msg).toContain("/r/ sounds");
  });
  it("non-milestone streak returns null", () => {
    expect(getCelebrationMessage({ type: "streak", value: 2 }, "Alex")).toBeNull();
  });
});
