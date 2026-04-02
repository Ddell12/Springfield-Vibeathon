import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "__tests__") {
      files.push(...collectSourceFiles(fullPath));
    } else if (
      entry.isFile() &&
      (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
      !entry.name.endsWith(".test.ts") &&
      !entry.name.endsWith(".spec.ts")
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("shared clinical boundary", () => {
  it("does not import feature modules", () => {
    const dir = path.resolve(process.cwd(), "src/shared/clinical");
    const files = collectSourceFiles(dir);

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source, `${file} must not import from @/features/`).not.toContain(
        "@/features/"
      );
    }
  });
});
