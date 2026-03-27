import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useInterview } from "../use-interview";

describe("useInterview", () => {
  it("initializes in category_select phase", () => {
    const { result } = renderHook(() => useInterview());
    expect(result.current.state.phase).toBe("category_select");
  });

  it("selectCategory transitions to essential", () => {
    const { result } = renderHook(() => useInterview());
    act(() => result.current.selectCategory("communication-board"));
    expect(result.current.state.phase).toBe("essential");
    expect(result.current.state.category).toBe("communication-board");
  });

  it("answer stores value and advances", () => {
    const { result } = renderHook(() => useInterview());
    act(() => result.current.selectCategory("communication-board"));
    act(() => result.current.answer("age_range", "preschool"));
    expect(result.current.state.answers["age_range"]).toBe("preschool");
    expect(result.current.state.currentQuestionIndex).toBe(1);
  });

  it("reset returns to initial state", () => {
    const { result } = renderHook(() => useInterview());
    act(() => result.current.selectCategory("communication-board"));
    act(() => result.current.reset());
    expect(result.current.state.phase).toBe("category_select");
  });

  it("addFreeform appends note", () => {
    const { result } = renderHook(() => useInterview());
    act(() => result.current.addFreeform("dinosaur themed"));
    expect(result.current.state.freeformNotes).toContain("dinosaur themed");
  });
});
