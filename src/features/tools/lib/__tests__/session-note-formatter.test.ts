import { describe, expect, it } from "vitest";

import { formatSessionNote } from "../session-note-formatter";

const now = Date.now();
const events = [
  { type: "item_tapped", payloadJson: JSON.stringify({ label: "more" }), timestamp: now },
  { type: "item_tapped", payloadJson: JSON.stringify({ label: "more" }), timestamp: now },
  { type: "token_added", timestamp: now },
  { type: "activity_completed", timestamp: now },
];

describe("formatSessionNote", () => {
  it("includes tool title and template type", () => {
    const note = formatSessionNote({
      toolTitle: "Marcus Token Board",
      templateType: "token_board",
      durationSeconds: 503,
      events,
    });
    expect(note).toContain("Marcus Token Board");
    expect(note).toContain("Token Board");
  });

  it("formats duration correctly", () => {
    const note = formatSessionNote({
      toolTitle: "Test", templateType: "token_board",
      durationSeconds: 503, events: [],
    });
    expect(note).toContain("8 min 23 sec");
  });

  it("counts total interactions", () => {
    const note = formatSessionNote({
      toolTitle: "Test", templateType: "token_board",
      durationSeconds: 60, events,
    });
    expect(note).toContain("4 total");
  });

  it("counts completions", () => {
    const note = formatSessionNote({
      toolTitle: "Test", templateType: "token_board",
      durationSeconds: 60, events,
    });
    expect(note).toContain("1 completion");
  });

  it("includes goal tags when provided", () => {
    const note = formatSessionNote({
      toolTitle: "Test", templateType: "token_board",
      durationSeconds: 60, events: [],
      goalTags: ["positive reinforcement", "on-task behavior"],
    });
    expect(note).toContain("positive reinforcement");
    expect(note).toContain("on-task behavior");
  });

  it("omits goal tags line when none provided", () => {
    const note = formatSessionNote({
      toolTitle: "Test", templateType: "token_board",
      durationSeconds: 60, events: [],
    });
    expect(note).not.toContain("Goal");
  });
});
