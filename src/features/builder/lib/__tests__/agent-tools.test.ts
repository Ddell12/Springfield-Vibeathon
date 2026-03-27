// src/features/builder/lib/__tests__/agent-tools.test.ts
// @vitest-environment node
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createAgentTools,
  isValidFilePath,
  type ToolContext,
} from "../agent-tools";

// Minimal mock for ConvexHttpClient — implementation under test uses it for mutations
const mockConvexMutation = vi.fn().mockResolvedValue(undefined);
const mockConvex = {
  mutation: mockConvexMutation,
} as unknown as import("convex/browser").ConvexHttpClient;

let tempDir: string;

function makeContext(overrides?: Partial<ToolContext>): ToolContext {
  return {
    send: vi.fn(),
    sessionId: "mock-session-id" as unknown as import("convex/values").GenericId<"sessions">,
    collectedFiles: new Map<string, string>(),
    convex: mockConvex,
    buildDir: tempDir,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Create a fresh temp directory per test
  tempDir = mkdtempSync(join(tmpdir(), "agent-tools-test-"));
});

afterEach(() => {
  // Clean up temp dir
  rmSync(tempDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// isValidFilePath
// ---------------------------------------------------------------------------

describe("isValidFilePath", () => {
  it("accepts src/ paths with .tsx extension", () => {
    expect(isValidFilePath("src/App.tsx")).toBe(true);
  });

  it("accepts src/ paths with .ts extension", () => {
    expect(isValidFilePath("src/data.ts")).toBe(true);
  });

  it("accepts src/ paths with .css extension", () => {
    expect(isValidFilePath("src/styles.css")).toBe(true);
  });

  it("rejects paths outside src/", () => {
    expect(isValidFilePath("node_modules/foo.ts")).toBe(false);
  });

  it("rejects path traversal with ..", () => {
    expect(isValidFilePath("src/../etc/passwd")).toBe(false);
  });

  it("rejects double-slash paths", () => {
    expect(isValidFilePath("src//App.tsx")).toBe(false);
  });

  it("rejects unsupported extension .png", () => {
    expect(isValidFilePath("src/image.png")).toBe(false);
  });

  it("rejects unsupported extension .yaml", () => {
    expect(isValidFilePath("src/data.yaml")).toBe(false);
  });

  it("accepts allowed root config file tailwind.config.ts", () => {
    expect(isValidFilePath("tailwind.config.ts")).toBe(true);
  });

  it("accepts allowed root config file vite.config.ts", () => {
    expect(isValidFilePath("vite.config.ts")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createAgentTools
// ---------------------------------------------------------------------------

describe("createAgentTools", () => {
  it("returns array of 4 tools", () => {
    const ctx = makeContext();
    const tools = createAgentTools(ctx);
    expect(tools).toHaveLength(4);
  });

  it("each tool has name, description, inputSchema, and run", () => {
    const ctx = makeContext();
    const tools = createAgentTools(ctx);
    for (const tool of tools) {
      expect(typeof tool.name).toBe("string");
      expect(typeof tool.description).toBe("string");
      expect(tool.input_schema).toBeDefined();
      expect(typeof tool.run).toBe("function");
    }
  });

  it("tool names are set_app_name, write_file, read_file, list_files", () => {
    const ctx = makeContext();
    const tools = createAgentTools(ctx);
    const names = tools.map((t) => t.name);
    expect(names).toContain("set_app_name");
    expect(names).toContain("write_file");
    expect(names).toContain("read_file");
    expect(names).toContain("list_files");
  });

  describe("write_file tool", () => {
    it("stores file in collectedFiles Map", async () => {
      const ctx = makeContext();
      const tools = createAgentTools(ctx);
      const writeFile = tools.find((t) => t.name === "write_file")!;

      await writeFile.run({ path: "src/App.tsx", contents: "export default function App() {}" });

      expect(ctx.collectedFiles.get("src/App.tsx")).toBe("export default function App() {}");
    });

    it("writes file to disk in buildDir", async () => {
      const ctx = makeContext();
      const tools = createAgentTools(ctx);
      const writeFile = tools.find((t) => t.name === "write_file")!;

      await writeFile.run({ path: "src/App.tsx", contents: "export default function App() {}" });

      const diskPath = join(tempDir, "src/App.tsx");
      expect(existsSync(diskPath)).toBe(true);
      expect(readFileSync(diskPath, "utf-8")).toBe("export default function App() {}");
    });

    it("creates intermediate directories when writing nested file", async () => {
      const ctx = makeContext();
      const tools = createAgentTools(ctx);
      const writeFile = tools.find((t) => t.name === "write_file")!;

      await writeFile.run({ path: "src/features/MyFeature.tsx", contents: "// feature" });

      const diskPath = join(tempDir, "src/features/MyFeature.tsx");
      expect(existsSync(diskPath)).toBe(true);
    });

    it("rejects invalid paths with ToolError", async () => {
      const ctx = makeContext();
      const tools = createAgentTools(ctx);
      const writeFile = tools.find((t) => t.name === "write_file")!;

      await expect(
        writeFile.run({ path: "node_modules/hack.ts", contents: "malicious" })
      ).rejects.toThrow();
    });

    it("blocks path traversal attempts", async () => {
      // We need to test a path that passes isValidFilePath but escapes the buildDir.
      // The isValidFilePath check rejects ".." already, so we test that the
      // resolve guard is in place by directly checking the guard logic.
      // Instead, test a path that would be valid but still blocked by resolve guard
      // by testing the ToolError message for a .. path.
      const ctx = makeContext();
      const tools = createAgentTools(ctx);
      const writeFile = tools.find((t) => t.name === "write_file")!;

      // This path will be caught by isValidFilePath first (contains ..)
      await expect(
        writeFile.run({ path: "src/../../etc/passwd", contents: "hacked" })
      ).rejects.toThrow();
    });

    it("blocks overwriting protected scaffold files", async () => {
      const ctx = makeContext();
      const tools = createAgentTools(ctx);
      const writeFile = tools.find((t) => t.name === "write_file")!;

      await expect(
        writeFile.run({ path: "src/components/TokenBoard.tsx", contents: "// overwrite attempt" })
      ).rejects.toThrow("Cannot overwrite scaffold file");
    });

    it("blocks overwriting protected hooks", async () => {
      const ctx = makeContext();
      const tools = createAgentTools(ctx);
      const writeFile = tools.find((t) => t.name === "write_file")!;

      await expect(
        writeFile.run({ path: "src/hooks/useLocalStorage.ts", contents: "// overwrite attempt" })
      ).rejects.toThrow("Cannot overwrite scaffold file");
    });

    it("blocks overwriting files in src/components/ui/ directory", async () => {
      const ctx = makeContext();
      const tools = createAgentTools(ctx);
      const writeFile = tools.find((t) => t.name === "write_file")!;

      await expect(
        writeFile.run({ path: "src/components/ui/button.tsx", contents: "// overwrite attempt" })
      ).rejects.toThrow("Cannot overwrite scaffold file");
    });

    it("sends file_complete SSE event with path and contents", async () => {
      const ctx = makeContext();
      const tools = createAgentTools(ctx);
      const writeFile = tools.find((t) => t.name === "write_file")!;

      await writeFile.run({ path: "src/App.tsx", contents: "export default function App() {}" });

      expect(ctx.send).toHaveBeenCalledWith("file_complete", {
        path: "src/App.tsx",
        contents: "export default function App() {}",
      });
    });

    it("sends activity SSE event after writing", async () => {
      const ctx = makeContext();
      const tools = createAgentTools(ctx);
      const writeFile = tools.find((t) => t.name === "write_file")!;

      await writeFile.run({ path: "src/App.tsx", contents: "export default function App() {}" });

      expect(ctx.send).toHaveBeenCalledWith(
        "activity",
        expect.objectContaining({ type: "file_written" })
      );
    });
  });

  describe("read_file tool", () => {
    it("reads file from disk (buildDir)", async () => {
      // Pre-populate the disk
      const srcDir = join(tempDir, "src");
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, "App.tsx"), "// from disk");

      const ctx = makeContext();
      const tools = createAgentTools(ctx);
      const readFile = tools.find((t) => t.name === "read_file")!;

      const result = await readFile.run({ path: "src/App.tsx" });

      expect(result).toBe("// from disk");
    });

    it("reads file written by write_file tool from disk", async () => {
      const ctx = makeContext();
      const tools = createAgentTools(ctx);
      const writeFile = tools.find((t) => t.name === "write_file")!;
      const readFile = tools.find((t) => t.name === "read_file")!;

      await writeFile.run({ path: "src/App.tsx", contents: "// just written" });
      const result = await readFile.run({ path: "src/App.tsx" });

      expect(result).toBe("// just written");
    });

    it("throws ToolError for missing files", async () => {
      const ctx = makeContext();
      const tools = createAgentTools(ctx);
      const readFile = tools.find((t) => t.name === "read_file")!;

      await expect(
        readFile.run({ path: "src/does-not-exist.ts" })
      ).rejects.toThrow();
    });
  });

  describe("set_app_name tool", () => {
    it("calls convex mutation and sends SSE", async () => {
      const ctx = makeContext();
      const tools = createAgentTools(ctx);
      const setAppName = tools.find((t) => t.name === "set_app_name")!;

      await setAppName.run({ name: "Morning Star Board" });

      expect(mockConvexMutation).toHaveBeenCalled();
      expect(ctx.send).toHaveBeenCalledWith(
        "app_name",
        expect.objectContaining({ name: "Morning Star Board" })
      );
    });
  });

  describe("list_files tool", () => {
    it("lists files from disk buildDir", async () => {
      // Pre-populate the disk
      const srcDir = join(tempDir, "src");
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, "App.tsx"), "// app");
      writeFileSync(join(srcDir, "main.tsx"), "// main");

      const ctx = makeContext();
      const tools = createAgentTools(ctx);
      const listFiles = tools.find((t) => t.name === "list_files")!;

      const result = await listFiles.run({ directory: "src" });

      expect(typeof result).toBe("string");
      expect(result).toContain("App.tsx");
      expect(result).toContain("main.tsx");
    });

    it("includes files written by write_file tool", async () => {
      const ctx = makeContext();
      const tools = createAgentTools(ctx);
      const writeFile = tools.find((t) => t.name === "write_file")!;
      const listFiles = tools.find((t) => t.name === "list_files")!;

      await writeFile.run({ path: "src/App.tsx", contents: "// my app" });
      const result = await listFiles.run({ directory: "src" });

      expect(result).toContain("App.tsx");
    });

    it("appends trailing slash for directories in listing", async () => {
      // Pre-populate with a subdirectory
      const componentsDir = join(tempDir, "src", "components");
      mkdirSync(componentsDir, { recursive: true });
      writeFileSync(join(componentsDir, "Foo.tsx"), "// foo");

      const srcDir = join(tempDir, "src");
      writeFileSync(join(srcDir, "App.tsx"), "// app");

      const ctx = makeContext();
      const tools = createAgentTools(ctx);
      const listFiles = tools.find((t) => t.name === "list_files")!;

      const result = await listFiles.run({ directory: "src" });

      expect(result).toContain("components/");
      expect(result).toContain("App.tsx");
    });

    it("returns 'Directory not found' for nonexistent directory", async () => {
      const ctx = makeContext();
      const tools = createAgentTools(ctx);
      const listFiles = tools.find((t) => t.name === "list_files")!;

      const result = await listFiles.run({ directory: "src/nonexistent" });

      expect(result).toBe("Directory not found");
    });
  });
});
