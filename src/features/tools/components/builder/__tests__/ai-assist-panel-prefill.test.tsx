import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../hooks/use-ai-config-assist", () => ({
  useAIConfigAssist: () => ({ status: "idle", error: null, generate: vi.fn() }),
}));
vi.mock("../../lib/ai/generation-profile", () => ({
  DEFAULT_GENERATION_PROFILE: {},
}));

import { AIAssistPanel } from "../ai-assist-panel";

describe("AIAssistPanel", () => {
  it("pre-fills textarea when initialDescription is provided", () => {
    render(
      <AIAssistPanel
        templateType="token_board"
        childProfile={{}}
        initialDescription="token board for Marcus, 5 tokens"
        onApply={vi.fn()}
      />
    );
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("token board for Marcus, 5 tokens");
  });

  it("textarea is empty when initialDescription is not provided", () => {
    render(
      <AIAssistPanel
        templateType="token_board"
        childProfile={{}}
        onApply={vi.fn()}
      />
    );
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("");
  });
});
