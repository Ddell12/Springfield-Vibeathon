import type { FileSystemTree } from "@webcontainer/api";

// Mock the webcontainer-files module before importing template-files
// Path is relative to THIS test file (lib/__tests__/), so go up two levels to reach hooks/
vi.mock("../../hooks/webcontainer-files", () => ({
  templateFiles: {
    "package.json": {
      file: { contents: '{"name":"therapy-app"}' },
    },
    "index.html": {
      file: { contents: "<html></html>" },
    },
    // This should be skipped
    src: {
      directory: {
        "App.tsx": {
          file: { contents: "// generated app" },
        },
        "main.tsx": {
          file: { contents: "import React from 'react'" },
        },
        // Entry with non-string contents — should be skipped
        "binary.wasm": {
          file: { contents: new Uint8Array([0, 1, 2]) },
        },
        components: {
          directory: {
            "Button.tsx": {
              file: { contents: "export function Button() {}" },
            },
          },
        },
      },
    },
  } as FileSystemTree,
}));

import { getPublishableTemplateFiles } from "../template-files";

describe("getPublishableTemplateFiles", () => {
  it("returns flattened files from the template tree", () => {
    const files = getPublishableTemplateFiles();
    const paths = files.map((f) => f.file);
    expect(paths).toContain("package.json");
    expect(paths).toContain("index.html");
  });

  it("skips src/App.tsx (placeholder replaced by generated code)", () => {
    const files = getPublishableTemplateFiles();
    const paths = files.map((f) => f.file);
    expect(paths).not.toContain("src/App.tsx");
  });

  it("includes nested files (src/main.tsx)", () => {
    const files = getPublishableTemplateFiles();
    const paths = files.map((f) => f.file);
    expect(paths).toContain("src/main.tsx");
  });

  it("includes deeply nested files (src/components/Button.tsx)", () => {
    const files = getPublishableTemplateFiles();
    const paths = files.map((f) => f.file);
    expect(paths).toContain("src/components/Button.tsx");
  });

  it("skips files with non-string contents", () => {
    const files = getPublishableTemplateFiles();
    const paths = files.map((f) => f.file);
    expect(paths).not.toContain("src/binary.wasm");
  });

  it("returns correct file data", () => {
    const files = getPublishableTemplateFiles();
    const pkgJson = files.find((f) => f.file === "package.json");
    expect(pkgJson?.data).toBe('{"name":"therapy-app"}');
  });
});
