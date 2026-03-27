import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useProgressNarration } from "../use-progress-narration";

describe("useProgressNarration", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("returns null when status is idle", () => {
    const { result } = renderHook(() => useProgressNarration("idle"));
    expect(result.current).toBeNull();
  });

  it("returns null when status is live", () => {
    const { result } = renderHook(() => useProgressNarration("live"));
    expect(result.current).toBeNull();
  });

  it("returns first stage message when generation starts", () => {
    const { result } = renderHook(() => useProgressNarration("generating"));
    expect(result.current).toBe("Reading your description...");
  });

  it("advances to second stage after 5 seconds", () => {
    const { result } = renderHook(() => useProgressNarration("generating"));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current).toBe("Designing the layout...");
  });

  it("advances through all stages on 5s intervals", () => {
    const { result } = renderHook(() => useProgressNarration("generating"));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current).toBe("Designing the layout...");
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current).toBe("Adding the fun parts...");
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current).toBe("Making it interactive...");
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current).toBe("Putting on the finishing touches...");
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current).toBe("Almost there...");
  });

  it("stays on last stage indefinitely", () => {
    const { result } = renderHook(() => useProgressNarration("generating"));
    act(() => { vi.advanceTimersByTime(60000); });
    expect(result.current).toBe("Almost there...");
  });

  it("overrides timer when overrideMessage is provided", () => {
    const { result, rerender } = renderHook(
      ({ status, override }) => useProgressNarration(status, override),
      { initialProps: { status: "generating" as const, override: undefined as string | undefined } }
    );
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current).toBe("Designing the layout...");
    rerender({ status: "generating" as const, override: "Creating pictures for your app..." });
    expect(result.current).toBe("Creating pictures for your app...");
    rerender({ status: "generating" as const, override: undefined });
    act(() => { vi.advanceTimersByTime(3000); });
    expect(result.current).not.toBe("Creating pictures for your app...");
  });

  it("resets to null when status changes from generating to live", () => {
    const { result, rerender } = renderHook(
      ({ status }) => useProgressNarration(status),
      { initialProps: { status: "generating" as const } }
    );
    expect(result.current).toBe("Reading your description...");
    rerender({ status: "live" as const });
    expect(result.current).toBeNull();
  });
});
