// src/features/builder/lib/__tests__/webcontainer-files.test.ts
import { describe, expect, it } from "vitest";

import { templateFiles } from "../webcontainer-files";

// The FileSystemTree structure mirrors the e2b-templates/vite-therapy/ directory.
// Each file entry is: { file: { contents: string } }
// Each directory entry is: { directory: { [name]: FileNode | DirectoryNode } }

describe("templateFiles — FileSystemTree structure", () => {
  it("has a 'package.json' key at root", () => {
    expect("package.json" in templateFiles).toBe(true);
  });

  it("package.json entry has file.contents", () => {
    const entry = templateFiles["package.json"] as { file: { contents: string } };
    expect(entry.file).toBeDefined();
    expect(typeof entry.file.contents).toBe("string");
  });

  it("package.json contents is valid JSON", () => {
    const entry = templateFiles["package.json"] as { file: { contents: string } };
    expect(() => JSON.parse(entry.file.contents)).not.toThrow();
  });

  it("package.json includes react as a dependency", () => {
    const entry = templateFiles["package.json"] as { file: { contents: string } };
    const pkg = JSON.parse(entry.file.contents);
    expect(pkg.dependencies?.react).toBeDefined();
  });

  it("package.json includes react-dom as a dependency", () => {
    const entry = templateFiles["package.json"] as { file: { contents: string } };
    const pkg = JSON.parse(entry.file.contents);
    expect(pkg.dependencies?.["react-dom"]).toBeDefined();
  });

  it("package.json includes lucide-react as a dependency", () => {
    const entry = templateFiles["package.json"] as { file: { contents: string } };
    const pkg = JSON.parse(entry.file.contents);
    expect(pkg.dependencies?.["lucide-react"]).toBeDefined();
  });

  it("package.json includes @radix-ui/react-progress as a dependency", () => {
    const entry = templateFiles["package.json"] as { file: { contents: string } };
    const pkg = JSON.parse(entry.file.contents);
    expect(pkg.dependencies?.["@radix-ui/react-progress"]).toBeDefined();
  });

  it("package.json includes @radix-ui/react-slot as a dependency", () => {
    const entry = templateFiles["package.json"] as { file: { contents: string } };
    const pkg = JSON.parse(entry.file.contents);
    expect(pkg.dependencies?.["@radix-ui/react-slot"]).toBeDefined();
  });

  it("package.json includes class-variance-authority as a dependency", () => {
    const entry = templateFiles["package.json"] as { file: { contents: string } };
    const pkg = JSON.parse(entry.file.contents);
    expect(pkg.dependencies?.["class-variance-authority"]).toBeDefined();
  });

  it("package.json includes clsx as a dependency", () => {
    const entry = templateFiles["package.json"] as { file: { contents: string } };
    const pkg = JSON.parse(entry.file.contents);
    expect(pkg.dependencies?.clsx).toBeDefined();
  });

  it("package.json includes motion as a dependency", () => {
    const entry = templateFiles["package.json"] as { file: { contents: string } };
    const pkg = JSON.parse(entry.file.contents);
    expect(pkg.dependencies?.motion).toBeDefined();
  });

  it("package.json includes tailwind-merge as a dependency", () => {
    const entry = templateFiles["package.json"] as { file: { contents: string } };
    const pkg = JSON.parse(entry.file.contents);
    expect(pkg.dependencies?.["tailwind-merge"]).toBeDefined();
  });

  it("has a 'src' directory entry at root", () => {
    expect("src" in templateFiles).toBe(true);
    const src = templateFiles["src"] as { directory: Record<string, unknown> };
    expect(src.directory).toBeDefined();
  });

  it("src directory contains App.tsx", () => {
    const src = templateFiles["src"] as { directory: Record<string, unknown> };
    expect("App.tsx" in src.directory).toBe(true);
  });

  it("src directory contains main.tsx", () => {
    const src = templateFiles["src"] as { directory: Record<string, unknown> };
    expect("main.tsx" in src.directory).toBe(true);
  });

  it("src directory contains therapy-ui.css", () => {
    const src = templateFiles["src"] as { directory: Record<string, unknown> };
    expect("therapy-ui.css" in src.directory).toBe(true);
  });

  it("src directory contains components subdirectory", () => {
    const src = templateFiles["src"] as { directory: Record<string, unknown> };
    expect("components" in src.directory).toBe(true);
    const components = src.directory["components"] as { directory: Record<string, unknown> };
    expect(components.directory).toBeDefined();
  });

  it("components directory has 9 component files", () => {
    const src = templateFiles["src"] as { directory: Record<string, unknown> };
    const components = src.directory["components"] as { directory: Record<string, unknown> };
    const componentFiles = Object.keys(components.directory).filter((k) => k.endsWith(".tsx"));
    expect(componentFiles).toHaveLength(9);
  });

  it("components directory has an index.ts", () => {
    const src = templateFiles["src"] as { directory: Record<string, unknown> };
    const components = src.directory["components"] as { directory: Record<string, unknown> };
    expect("index.ts" in components.directory).toBe(true);
  });

  it("components directory includes TokenBoard.tsx", () => {
    const src = templateFiles["src"] as { directory: Record<string, unknown> };
    const components = src.directory["components"] as { directory: Record<string, unknown> };
    expect("TokenBoard.tsx" in components.directory).toBe(true);
  });

  it("components directory includes VisualSchedule.tsx", () => {
    const src = templateFiles["src"] as { directory: Record<string, unknown> };
    const components = src.directory["components"] as { directory: Record<string, unknown> };
    expect("VisualSchedule.tsx" in components.directory).toBe(true);
  });

  it("components directory includes CommunicationBoard.tsx", () => {
    const src = templateFiles["src"] as { directory: Record<string, unknown> };
    const components = src.directory["components"] as { directory: Record<string, unknown> };
    expect("CommunicationBoard.tsx" in components.directory).toBe(true);
  });

  it("src directory contains hooks subdirectory", () => {
    const src = templateFiles["src"] as { directory: Record<string, unknown> };
    expect("hooks" in src.directory).toBe(true);
    const hooks = src.directory["hooks"] as { directory: Record<string, unknown> };
    expect(hooks.directory).toBeDefined();
  });

  it("hooks directory has 5 hook files", () => {
    const src = templateFiles["src"] as { directory: Record<string, unknown> };
    const hooks = src.directory["hooks"] as { directory: Record<string, unknown> };
    expect(Object.keys(hooks.directory)).toHaveLength(5);
  });

  it("hooks directory includes useLocalStorage.ts", () => {
    const src = templateFiles["src"] as { directory: Record<string, unknown> };
    const hooks = src.directory["hooks"] as { directory: Record<string, unknown> };
    expect("useLocalStorage.ts" in hooks.directory).toBe(true);
  });

  it("hooks directory includes useConvexData.ts", () => {
    const src = templateFiles["src"] as { directory: Record<string, unknown> };
    const hooks = src.directory["hooks"] as { directory: Record<string, unknown> };
    expect("useConvexData.ts" in hooks.directory).toBe(true);
  });

  it("has a 'vite.config.ts' key at root", () => {
    expect("vite.config.ts" in templateFiles).toBe(true);
  });

  it("vite.config.ts contents include allowedHosts", () => {
    const entry = templateFiles["vite.config.ts"] as { file: { contents: string } };
    expect(entry.file.contents).toContain("allowedHosts");
  });
});
