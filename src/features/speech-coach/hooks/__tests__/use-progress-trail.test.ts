import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useProgressTrail } from "../use-progress-trail";

describe("useProgressTrail", () => {
  it("returns 0 filled when totalCorrect is 0", () => {
    const { result } = renderHook(() => useProgressTrail(0));
    expect(result.current.filled).toBe(0);
    expect(result.current.total).toBe(5);
  });

  it("returns correct filled count within a 5-attempt window", () => {
    const { result } = renderHook(() => useProgressTrail(3));
    expect(result.current.filled).toBe(3);
  });

  it("resets to 0 filled after hitting the 5-attempt milestone", () => {
    const { result } = renderHook(() => useProgressTrail(5));
    expect(result.current.filled).toBe(0);
  });

  it("wraps correctly at 6 correct", () => {
    const { result } = renderHook(() => useProgressTrail(6));
    expect(result.current.filled).toBe(1);
  });

  it("wraps correctly at 10 correct", () => {
    const { result } = renderHook(() => useProgressTrail(10));
    expect(result.current.filled).toBe(0);
  });

  it("wraps correctly at 11 correct", () => {
    const { result } = renderHook(() => useProgressTrail(11));
    expect(result.current.filled).toBe(1);
  });
});
