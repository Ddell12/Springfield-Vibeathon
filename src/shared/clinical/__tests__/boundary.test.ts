import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("shared clinical boundary", () => {
  it("does not import feature modules", () => {
    const dir = path.resolve(process.cwd(), "src/shared/clinical");
    const files = readdirSync(dir).filter((file) => file.endsWith(".ts"));

    for (const file of files) {
      const source = readFileSync(path.join(dir, file), "utf8");
      expect(source).not.toContain("@/features/");
    }
  });
});
