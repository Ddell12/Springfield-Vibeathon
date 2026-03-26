// src/features/builder/lib/__tests__/agent-tools.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  createAgentTools,
  isValidFilePath,
  getTemplateFileContents,
  getTemplateDirectoryListing,
  type ToolContext,
} from "../agent-tools";

// Minimal mock for ConvexHttpClient — implementation under test uses it for mutations
const mockConvexMutation = vi.fn().mockResolvedValue(undefined);
const mockConvex = {
  mutation: mockConvexMutation,
} as unknown as import("convex/browser").ConvexHttpClient;

function makeContext(overrides?: Partial<ToolContext>): ToolContext {
  return {
    send: vi.fn(),
    sessionId: "mock-session-id" as unknown as import("convex/values").GenericId<"sessions">,
    collectedFiles: new Map<string, string>(),
    convex: mockConvex,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
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
// getTemplateFileContents
// ---------------------------------------------------------------------------

describe("getTemplateFileContents", () => {
  it("returns contents for known template file src/lib/utils.ts containing cn", () => {
    const contents = getTemplateFileContents("src/lib/utils.ts");
    expect(contents).not.toBeNull();
    expect(contents).toContain("cn");
  });

  it("returns null for a nonexistent file", () => {
    const contents = getTemplateFileContents("src/does-not-exist.ts");
    expect(contents).toBeNull();
  });

  it("returns contents for nested component src/components/TokenBoard.tsx", () => {
    const contents = getTemplateFileContents("src/components/TokenBoard.tsx");
    expect(contents).not.toBeNull();
    expect(typeof contents).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// getTemplateDirectoryListing
// ---------------------------------------------------------------------------

describe("getTemplateDirectoryListing", () => {
  it("lists template files in src/components/", () => {
    const listing = getTemplateDirectoryListing("src/components/", new Map());
    expect(Array.isArray(listing)).toBe(true);
    expect(listing.length).toBeGreaterThan(0);
    // Should include at least some known components
    expect(listing.some((f) => f.includes("TokenBoard"))).toBe(true);
  });

  it("merges generated files into listing", () => {
    const generated = new Map([["src/components/MyCustom.tsx", "export default function MyCustom() {}"]]);
    const listing = getTemplateDirectoryListing("src/components/", generated);
    expect(listing).toContain("src/components/MyCustom.tsx");
  });

  it("returns empty array for nonexistent directory", () => {
    const listing = getTemplateDirectoryListing("src/nonexistent/", new Map());
    expect(listing).toEqual([]);
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
      expect(tool.inputSchema).toBeDefined();
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

    it("rejects invalid paths with ToolError or thrown error", async () => {
      const ctx = makeContext();
      const tools = createAgentTools(ctx);
      const writeFile = tools.find((t) => t.name === "write_file")!;

      await expect(
        writeFile.run({ path: "node_modules/hack.ts", contents: "malicious" })
      ).rejects.toThrow();
    });

    it("sends file_complete SSE event after writing", async () => {
      const ctx = makeContext();
      const tools = createAgentTools(ctx);
      const writeFile = tools.find((t) => t.name === "write_file")!;

      await writeFile.run({ path: "src/App.tsx", contents: "export default function App() {}" });

      expect(ctx.send).toHaveBeenCalledWith(
        "file_complete",
        expect.objectContaining({ path: "src/App.tsx" })
      );
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
    it("reads from generated files first", async () => {
      const ctx = makeContext();
      ctx.collectedFiles.set("src/App.tsx", "// generated version");
      const tools = createAgentTools(ctx);
      const readFile = tools.find((t) => t.name === "read_file")!;

      const result = await readFile.run({ path: "src/App.tsx" });

      expect(result).toContain("// generated version");
    });

    it("falls back to template files when not in generated files", async () => {
      const ctx = makeContext();
      const tools = createAgentTools(ctx);
      const readFile = tools.find((t) => t.name === "read_file")!;

      // src/lib/utils.ts exists in the template
      const result = await readFile.run({ path: "src/lib/utils.ts" });

      expect(result).toBeTruthy();
      expect(result).toContain("cn");
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
    it("returns template and generated files", async () => {
      const ctx = makeContext();
      ctx.collectedFiles.set("src/App.tsx", "// my app");
      const tools = createAgentTools(ctx);
      const listFiles = tools.find((t) => t.name === "list_files")!;

      const result = await listFiles.run({ directory: "src/" });

      // Result should be a string listing files
      expect(typeof result).toBe("string");
      expect(result).toContain("src/App.tsx");
    });
  });
});
