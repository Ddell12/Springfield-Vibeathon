import { afterEach,beforeEach, describe, expect, it, vi } from "vitest";

import { seedStateFromInstance } from "../tool-config-seed";

describe("seedStateFromInstance", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("parses valid configJson", () => {
    const onSeed = vi.fn();
    const cleanup = seedStateFromInstance(
      {
        _id: "test-id" as any,
        templateType: "aac_board",
        configJson: '{"title":"Board"}',
        status: "draft",
      },
      onSeed
    );
    vi.runAllTimers();
    expect(onSeed).toHaveBeenCalledWith(
      expect.objectContaining({ config: { title: "Board" } })
    );
    cleanup();
  });

  it("falls back to empty object on malformed JSON", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onSeed = vi.fn();
    const cleanup = seedStateFromInstance(
      {
        _id: "test-id" as any,
        templateType: "aac_board",
        configJson: "NOT_VALID_JSON{{{",
        status: "draft",
      },
      onSeed
    );
    vi.runAllTimers();
    expect(onSeed).toHaveBeenCalledWith(
      expect.objectContaining({ config: {} })
    );
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
    cleanup();
  });
});
