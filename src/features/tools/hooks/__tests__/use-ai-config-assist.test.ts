import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useAction: vi.fn(() =>
    vi.fn().mockResolvedValue({ configJson: '{"title":"Generated"}', error: undefined })
  ),
}));
vi.mock("@convex/_generated/api", () => ({
  api: { tools_ai: { generateToolConfig: "tools_ai:generateToolConfig" } },
}));

import { useAIConfigAssist } from "../use-ai-config-assist";

describe("useAIConfigAssist", () => {
  it("starts in idle state", () => {
    const { result } = renderHook(() =>
      useAIConfigAssist({ templateType: "aac_board", childProfile: {} })
    );
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
  });

  it("transitions to success after generate resolves", async () => {
    const { result } = renderHook(() =>
      useAIConfigAssist({ templateType: "aac_board", childProfile: {} })
    );
    await act(async () => {
      await result.current.generate("Make a snack board for Liam");
    });
    expect(result.current.status).toBe("success");
  });

  it("returns the configJson on success", async () => {
    const { result } = renderHook(() =>
      useAIConfigAssist({ templateType: "aac_board", childProfile: {} })
    );
    let returned: string | null = null;
    await act(async () => {
      returned = await result.current.generate("snack board");
    });
    expect(returned).toBe('{"title":"Generated"}');
  });
});
