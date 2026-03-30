import { act,renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useDeckNavigation } from "../use-deck-navigation";

describe("useDeckNavigation", () => {
  it("initializes with index 0", () => {
    const { result, unmount } = renderHook(() => useDeckNavigation(5));
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.totalCards).toBe(5);
    expect(result.current.isFirst).toBe(true);
    expect(result.current.isLast).toBe(false);
    unmount();
  });

  it("goNext advances the index", () => {
    const { result, unmount } = renderHook(() => useDeckNavigation(5));
    act(() => result.current.goNext());
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.isFirst).toBe(false);
    unmount();
  });

  it("goNext clamps at last card", () => {
    const { result, unmount } = renderHook(() => useDeckNavigation(3));
    act(() => result.current.goNext());
    act(() => result.current.goNext());
    act(() => result.current.goNext());
    act(() => result.current.goNext());
    expect(result.current.currentIndex).toBe(2);
    expect(result.current.isLast).toBe(true);
    unmount();
  });

  it("goPrev decrements the index", () => {
    const { result, unmount } = renderHook(() => useDeckNavigation(5));
    act(() => result.current.goNext());
    act(() => result.current.goNext());
    act(() => result.current.goPrev());
    expect(result.current.currentIndex).toBe(1);
    unmount();
  });

  it("goPrev clamps at 0", () => {
    const { result, unmount } = renderHook(() => useDeckNavigation(5));
    act(() => result.current.goPrev());
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.isFirst).toBe(true);
    unmount();
  });

  it("goTo navigates to a valid index", () => {
    const { result, unmount } = renderHook(() => useDeckNavigation(5));
    act(() => result.current.goTo(3));
    expect(result.current.currentIndex).toBe(3);
    unmount();
  });

  it("goTo clamps out-of-bounds index", () => {
    const { result, unmount } = renderHook(() => useDeckNavigation(5));
    act(() => result.current.goTo(2));
    expect(result.current.currentIndex).toBe(2);
    // Above upper bound: clamps to last index
    act(() => result.current.goTo(10));
    expect(result.current.currentIndex).toBe(4);
    // Below lower bound: clamps to 0
    act(() => result.current.goTo(-5));
    expect(result.current.currentIndex).toBe(0);
    // Exactly at upper bound (totalCards): clamps to totalCards - 1
    act(() => result.current.goTo(5));
    expect(result.current.currentIndex).toBe(4);
    unmount();
  });

  it("resets index when totalCards changes", () => {
    const { result, rerender, unmount } = renderHook(
      ({ total }) => useDeckNavigation(total),
      { initialProps: { total: 5 } },
    );
    act(() => result.current.goTo(3));
    expect(result.current.currentIndex).toBe(3);

    rerender({ total: 10 });
    expect(result.current.currentIndex).toBe(0);
    unmount();
  });

  it("isFirst and isLast are correct for single-card deck", () => {
    const { result, unmount } = renderHook(() => useDeckNavigation(1));
    expect(result.current.isFirst).toBe(true);
    expect(result.current.isLast).toBe(true);
    unmount();
  });

  it("responds to ArrowRight keyboard event", () => {
    const { result, unmount } = renderHook(() => useDeckNavigation(5));
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    });
    expect(result.current.currentIndex).toBe(1);
    unmount();
  });

  it("responds to ArrowLeft keyboard event", () => {
    const { result, unmount } = renderHook(() => useDeckNavigation(5));
    act(() => result.current.goTo(2));
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
    });
    expect(result.current.currentIndex).toBe(1);
    unmount();
  });
});
