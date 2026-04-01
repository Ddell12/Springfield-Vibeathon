import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { templateRegistry } from "@/features/tools/lib/registry";

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
});
