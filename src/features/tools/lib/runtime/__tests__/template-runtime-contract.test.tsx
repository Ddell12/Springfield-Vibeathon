import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { templateRegistry } from "@/features/tools/lib/registry";

import { RuntimeShell } from "../runtime-shell";

const MOCK_VOICE = {
  speak: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn(),
  status: "idle" as const,
};

describe("template runtime contract", () => {
  Object.entries(templateRegistry).forEach(([key, registration]) => {
    it(`${key} renders without crashing with voice prop and onEvent`, () => {
      expect(() =>
        render(
          <registration.Runtime
            config={registration.defaultConfig as never}
            mode="preview"
            onEvent={vi.fn()}
            voice={MOCK_VOICE}
          />
        )
      ).not.toThrow();
    });
  });

  it("each template registration declares shared shell defaults", () => {
    Object.values(templateRegistry).forEach((registration) => {
      expect(registration.shell).toBeDefined();
      expect(registration.shell.themePreset).toBeTruthy();
      expect(registration.shell.enableInstructions).toBeTypeOf("boolean");
    });
  });

  it("renders template content inside RuntimeShell-provided layout without crashing", () => {
    expect(() =>
      render(
        <RuntimeShell mode="preview" shell={templateRegistry.aac_board.shell} title="AAC Board">
          <templateRegistry.aac_board.Runtime
            config={templateRegistry.aac_board.defaultConfig as never}
            mode="preview"
            onEvent={vi.fn()}
            voice={MOCK_VOICE}
          />
        </RuntimeShell>
      )
    ).not.toThrow();
  });
});
