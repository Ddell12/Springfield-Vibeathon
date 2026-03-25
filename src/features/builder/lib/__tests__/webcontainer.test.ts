// src/features/builder/lib/__tests__/webcontainer.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock @webcontainer/api BEFORE importing the module under test
const mockTeardown = vi.fn().mockResolvedValue(undefined);
const mockWc = {
  mount: vi.fn(),
  on: vi.fn(),
  spawn: vi.fn(),
  fs: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
  teardown: mockTeardown,
};

vi.mock("@webcontainer/api", () => ({
  WebContainer: {
    boot: vi.fn().mockResolvedValue(mockWc),
  },
}));

describe("webcontainer — singleton lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton by re-importing (using resetModules)
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getWebContainer() boots WebContainer on first call", async () => {
    const { WebContainer } = await import("@webcontainer/api");
    const { getWebContainer } = await import("../webcontainer");
    await getWebContainer();
    expect(WebContainer.boot).toHaveBeenCalledTimes(1);
  });

  it("getWebContainer() returns same promise on second call (singleton)", async () => {
    const { getWebContainer } = await import("../webcontainer");
    const p1 = getWebContainer();
    const p2 = getWebContainer();
    // Must be the exact same promise reference
    expect(p1).toBe(p2);
  });

  it("getWebContainer() resolves to the WebContainer instance", async () => {
    const { getWebContainer } = await import("../webcontainer");
    const instance = await getWebContainer();
    expect(instance).toBe(mockWc);
  });

  it("getWebContainer() in SSR context (window undefined) returns a never-resolving promise", async () => {
    vi.stubGlobal("window", undefined);
    const { getWebContainer } = await import("../webcontainer");
    const promise = getWebContainer();
    // Should not resolve — verify it stays pending using a race
    const NEVER = Symbol("never");
    const result = await Promise.race([
      promise,
      Promise.resolve(NEVER),
    ]);
    expect(result).toBe(NEVER);
  });

  it("teardownWebContainer() calls wc.teardown() and resets singleton", async () => {
    const { getWebContainer, teardownWebContainer } = await import("../webcontainer");
    // Boot first to create singleton
    await getWebContainer();
    await teardownWebContainer();
    expect(mockWc.teardown).toHaveBeenCalledTimes(1);
  });

  it("getWebContainer() after teardown boots a new instance", async () => {
    const { WebContainer } = await import("@webcontainer/api");
    const { getWebContainer, teardownWebContainer } = await import("../webcontainer");
    await getWebContainer();
    await teardownWebContainer();
    vi.clearAllMocks();
    await getWebContainer();
    expect(WebContainer.boot).toHaveBeenCalledTimes(1);
  });
});
