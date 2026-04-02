import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn().mockResolvedValue("inst-1")),
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
  it("initialises with null template and instance", () => {
    const { result } = renderHook(() => useToolBuilder());
    expect(result.current.templateType).toBeNull();
    expect(result.current.instanceId).toBeNull();
    expect(result.current.originalDescription).toBeNull();
  });

  it("publish panel is closed initially", () => {
    const { result } = renderHook(() => useToolBuilder());
    expect(result.current.isPublishOpen).toBe(false);
  });

  it("openPublish opens the publish panel", () => {
    const { result } = renderHook(() => useToolBuilder());
    act(() => result.current.openPublish());
    expect(result.current.isPublishOpen).toBe(true);
  });

  it("closePublish closes the publish panel", () => {
    const { result } = renderHook(() => useToolBuilder());
    act(() => result.current.openPublish());
    act(() => result.current.closePublish());
    expect(result.current.isPublishOpen).toBe(false);
  });

  it("selectPatient stores patientId", () => {
    const { result } = renderHook(() => useToolBuilder());
    act(() => result.current.selectPatient("patient-123" as never));
    expect(result.current.patientId).toBe("patient-123");
  });

  it("updateConfig stores new config", () => {
    const { result } = renderHook(() => useToolBuilder());
    const config = { title: "My Board" };
    act(() => result.current.updateConfig(config));
    expect(result.current.config).toEqual(config);
  });

  it("saveAndAdvance creates an instance when none exists", async () => {
    const { result } = renderHook(() => useToolBuilder());
    act(() => result.current.updateConfig({ title: "Test", tokenCount: 5 }));
    act(() => result.current.selectTemplate("token_board"));

    await act(async () => {
      await result.current.saveAndAdvance();
    });

    expect(result.current.instanceId).not.toBeNull();
  });

  it("appearance defaults to calm preset", () => {
    const { result } = renderHook(() => useToolBuilder());
    expect(result.current.appearance.themePreset).toBe("calm");
  });
});
