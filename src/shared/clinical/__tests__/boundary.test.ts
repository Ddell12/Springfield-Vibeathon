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
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name) && !entry.name.includes(".test.")) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("shared clinical boundary", () => {
  it("does not import feature modules", () => {
    const dir = path.resolve(process.cwd(), "src/shared/clinical");
    for (const file of collectSourceFiles(dir)) {
      const source = readFileSync(file, "utf8");
      expect(source, `${file} must not import from @/features/`).not.toContain("@/features/");
    }
  });

  it("session notes uses the shared clinical boundary for clinical hooks", () => {
    const file = path.resolve(process.cwd(), "src/features/session-notes/components/structured-data-form.tsx");
    const source = readFileSync(file, "utf8");
    expect(source).toContain('from "@/shared/clinical"');
    expect(source).not.toContain('from "@/features/goals/hooks/use-goals"');
  });

  it("feature components do not use relative imports for shared clinical hooks", () => {
    const featureDirs = [
      "src/features/session-notes",
      "src/features/plan-of-care",
      "src/features/evaluations",
      "src/features/discharge",
    ];
    for (const dir of featureDirs) {
      for (const file of collectSourceFiles(path.resolve(process.cwd(), dir))) {
        const source = readFileSync(file, "utf8");
        expect(source, `${file} must not use relative imports for goals/hooks`).not.toMatch(/from ['"]\.\..*goals\/hooks/);
        expect(source, `${file} must not use relative imports for patients\/hooks`).not.toMatch(/from ['"]\.\..*patients\/hooks/);
      }
    }
  });
});
