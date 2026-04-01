import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn().mockResolvedValue({ id: "inst-1", shareToken: "tok-abc" })),
  useQuery: vi.fn(() => undefined),
}));
vi.mock("@convex/_generated/api", () => ({
  api: {
    tools: {
      create: "tools:create",
      update: "tools:update",
      publish: "tools:publish",
      get: "tools:get",
    },
  },
}));

import { useToolBuilder } from "../use-tool-builder";

describe("useToolBuilder", () => {
  it("starts on step 1", () => {
    const { result } = renderHook(() => useToolBuilder());
    expect(result.current.step).toBe(1);
  });

  it("advances step when nextStep is called", () => {
    const { result } = renderHook(() => useToolBuilder());
    act(() => result.current.nextStep());
    expect(result.current.step).toBe(2);
  });

  it("cannot advance past step 4", () => {
    const { result } = renderHook(() => useToolBuilder());
    act(() => { for (let i = 0; i < 10; i++) result.current.nextStep(); });
    expect(result.current.step).toBeLessThanOrEqual(4);
  });

  it("goes back one step when prevStep is called", () => {
    const { result } = renderHook(() => useToolBuilder());
    act(() => result.current.nextStep());
    act(() => result.current.prevStep());
    expect(result.current.step).toBe(1);
  });

  it("stores patientId after selectPatient", () => {
    const { result } = renderHook(() => useToolBuilder());
    act(() => result.current.selectPatient("patient-123" as never));
    expect(result.current.patientId).toBe("patient-123");
  });

  it("stores templateType and default config after selectTemplate", () => {
    const { result } = renderHook(() => useToolBuilder());
    act(() => result.current.selectTemplate("aac_board"));
    expect(result.current.templateType).toBe("aac_board");
    expect(result.current.config).not.toBeNull();
  });

  it("updates config when updateConfig is called", () => {
    const { result } = renderHook(() => useToolBuilder());
    const newConfig = { title: "Updated" };
    act(() => result.current.updateConfig(newConfig));
    expect(result.current.config).toEqual(newConfig);
  });

  it("allows saveAndAdvance without patientId", async () => {
    const { result } = renderHook(() => useToolBuilder());
    act(() => result.current.selectTemplate("aac_board"));

    await act(async () => {
      await result.current.saveAndAdvance();
    });

    expect(result.current.instanceId).not.toBeNull();
  });
});
