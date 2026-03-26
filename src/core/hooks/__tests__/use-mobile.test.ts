import { renderHook } from "@testing-library/react";

import { useIsMobile } from "../use-mobile";

function installMatchMedia(matches: boolean) {
  const listeners: Array<() => void> = [];
  const mql = {
    matches,
    addEventListener: vi.fn((_event: string, handler: () => void) => {
      listeners.push(handler);
    }),
    removeEventListener: vi.fn((_event: string, handler: () => void) => {
      const idx = listeners.indexOf(handler);
      if (idx !== -1) listeners.splice(idx, 1);
    }),
  };
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue(mql),
  });
  return mql;
}

describe("useIsMobile", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true when matchMedia reports a mobile viewport", () => {
    installMatchMedia(true);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("returns false when matchMedia reports a desktop viewport", () => {
    installMatchMedia(false);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("subscribes to matchMedia change events", () => {
    const mql = installMatchMedia(false);
    renderHook(() => useIsMobile());
    expect(mql.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("removes the event listener on unmount (cleanup)", () => {
    const mql = installMatchMedia(false);
    const { unmount } = renderHook(() => useIsMobile());
    unmount();
    expect(mql.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("returns false (initial state) when matchMedia is not a function", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: "not-a-function",
    });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });
});
