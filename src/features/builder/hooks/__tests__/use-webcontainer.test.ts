// src/features/builder/hooks/__tests__/use-webcontainer.test.ts
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the webcontainer singleton module
const mockServerReadyCallbacks: Array<(port: number, url: string) => void> = [];

const mockWc = {
  mount: vi.fn().mockResolvedValue(undefined),
  on: vi.fn().mockImplementation((event: string, cb: (port: number, url: string) => void) => {
    if (event === "server-ready") {
      mockServerReadyCallbacks.push(cb);
    }
  }),
  spawn: vi.fn().mockResolvedValue({
    exit: Promise.resolve(0),
    output: { pipeTo: vi.fn() },
  }),
  fs: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
  teardown: vi.fn().mockResolvedValue(undefined),
};

vi.mock("../webcontainer", () => ({
  getWebContainer: vi.fn().mockResolvedValue(mockWc),
  teardownWebContainer: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../webcontainer-files", () => ({
  templateFiles: {
    "package.json": { file: { contents: '{"name":"test"}' } },
  },
}));

describe("useWebContainer — WebContainer lifecycle hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockServerReadyCallbacks.length = 0;
  });

  it("initial status is 'booting'", async () => {
    const { useWebContainer } = await import("../use-webcontainer");
    const { result } = renderHook(() => useWebContainer());
    expect(result.current.status).toBe("booting");
  });

  it("previewUrl is null initially", async () => {
    const { useWebContainer } = await import("../use-webcontainer");
    const { result } = renderHook(() => useWebContainer());
    expect(result.current.previewUrl).toBeNull();
  });

  it("writeFile is a function", async () => {
    const { useWebContainer } = await import("../use-webcontainer");
    const { result } = renderHook(() => useWebContainer());
    expect(typeof result.current.writeFile).toBe("function");
  });

  it("after mock server-ready fires, previewUrl is set and status is 'ready'", async () => {
    const { useWebContainer } = await import("../use-webcontainer");
    const { result } = renderHook(() => useWebContainer());

    // Allow the boot effect to run
    await act(async () => {
      await Promise.resolve();
    });

    // Fire the server-ready event
    await act(async () => {
      for (const cb of mockServerReadyCallbacks) {
        cb(5173, "http://localhost:5173");
      }
    });

    expect(result.current.previewUrl).toBe("http://localhost:5173");
    expect(result.current.status).toBe("ready");
  });

  it("writeFile for nested path calls wc.fs.mkdir then wc.fs.writeFile", async () => {
    const { useWebContainer } = await import("../use-webcontainer");
    const { result } = renderHook(() => useWebContainer());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.writeFile("src/App.tsx", "export default function App() {}");
    });

    expect(mockWc.fs.mkdir).toHaveBeenCalledWith("src", { recursive: true });
    expect(mockWc.fs.writeFile).toHaveBeenCalledWith(
      "src/App.tsx",
      "export default function App() {}"
    );
  });

  it("writeFile for root-level file (no slash in path) skips mkdir", async () => {
    const { useWebContainer } = await import("../use-webcontainer");
    const { result } = renderHook(() => useWebContainer());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.writeFile("index.html", "<html></html>");
    });

    expect(mockWc.fs.mkdir).not.toHaveBeenCalled();
    expect(mockWc.fs.writeFile).toHaveBeenCalledWith("index.html", "<html></html>");
  });

  it("on npm install exit code non-zero, status becomes 'error'", async () => {
    // Override spawn to return non-zero exit code for npm install
    mockWc.spawn.mockResolvedValueOnce({
      exit: Promise.resolve(1),
      output: { pipeTo: vi.fn() },
    });

    const { useWebContainer } = await import("../use-webcontainer");
    const { result } = renderHook(() => useWebContainer());

    await act(async () => {
      // Allow all async effects to settle
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.status).toBe("error");
  });
});
