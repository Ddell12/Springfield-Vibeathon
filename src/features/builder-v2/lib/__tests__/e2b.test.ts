import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSandbox, executeFragment, getSandboxUrl } from "../e2b";
import type { FragmentResult } from "../schema";

// Mock the E2B SDK
const mockWriteFile = vi.fn();
const mockClose = vi.fn();
const mockGetHost = vi.fn();

const mockSandboxInstance = {
  sandboxId: "sandbox-abc-123",
  files: {
    write: mockWriteFile,
  },
  getHost: mockGetHost,
  close: mockClose,
};

vi.mock("@e2b/code-interpreter", () => ({
  Sandbox: {
    create: vi.fn(),
    connect: vi.fn(),
  },
}));

const validFragment: FragmentResult = {
  title: "Morning Routine Tracker",
  description: "Interactive morning routine for children",
  template: "nextjs-developer",
  code: "export default function App() { return <div>Hello</div>; }",
  file_path: "app/page.tsx",
  has_additional_dependencies: false,
  port: 3000,
};

describe("getSandboxUrl", () => {
  it("returns a properly formatted URL from host and port", () => {
    const url = getSandboxUrl("abc123.sandbox.e2b.app", 3000);
    expect(url).toBe("https://abc123.sandbox.e2b.app");
  });

  it("returns a string starting with https", () => {
    const url = getSandboxUrl("abc123.sandbox.e2b.app", 3000);
    expect(url).toMatch(/^https:\/\//);
  });

  it("includes the host in the URL", () => {
    const url = getSandboxUrl("host.e2b.app", 3000);
    expect(url).toContain("host.e2b.app");
  });
});

describe("createSandbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls Sandbox.create with the correct template", async () => {
    const { Sandbox } = await import("@e2b/code-interpreter");
    mockGetHost.mockReturnValue("sandbox-abc-123-3000.e2b.app");
    vi.mocked(Sandbox.create).mockResolvedValue(mockSandboxInstance as any);

    await createSandbox(validFragment);

    expect(Sandbox.create).toHaveBeenCalledWith(
      validFragment.template,
      expect.anything()
    );
  });

  it("writes the fragment code to the correct file path", async () => {
    const { Sandbox } = await import("@e2b/code-interpreter");
    mockGetHost.mockReturnValue("sandbox-abc-123-3000.e2b.app");
    vi.mocked(Sandbox.create).mockResolvedValue(mockSandboxInstance as any);

    await createSandbox(validFragment);

    expect(mockWriteFile).toHaveBeenCalledWith(
      validFragment.file_path,
      validFragment.code
    );
  });

  it("returns a sandboxId and url", async () => {
    const { Sandbox } = await import("@e2b/code-interpreter");
    mockGetHost.mockReturnValue("sandbox-abc-123-3000.e2b.app");
    vi.mocked(Sandbox.create).mockResolvedValue(mockSandboxInstance as any);

    const result = await createSandbox(validFragment);

    expect(result).toHaveProperty("sandboxId");
    expect(result).toHaveProperty("url");
    expect(typeof result.sandboxId).toBe("string");
    expect(typeof result.url).toBe("string");
  });

  it("returns the sandbox id from the created sandbox", async () => {
    const { Sandbox } = await import("@e2b/code-interpreter");
    mockGetHost.mockReturnValue("sandbox-abc-123-3000.e2b.app");
    vi.mocked(Sandbox.create).mockResolvedValue(mockSandboxInstance as any);

    const result = await createSandbox(validFragment);

    expect(result.sandboxId).toBe("sandbox-abc-123");
  });
});

describe("executeFragment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("connects to an existing sandbox and updates the code file", async () => {
    const { Sandbox } = await import("@e2b/code-interpreter");
    mockGetHost.mockReturnValue("sandbox-abc-123-3000.e2b.app");
    vi.mocked(Sandbox.connect).mockResolvedValue(mockSandboxInstance as any);

    await executeFragment("sandbox-abc-123", validFragment);

    expect(mockWriteFile).toHaveBeenCalledWith(
      validFragment.file_path,
      validFragment.code
    );
  });

  it("returns a sandboxId and url", async () => {
    const { Sandbox } = await import("@e2b/code-interpreter");
    mockGetHost.mockReturnValue("sandbox-abc-123-3000.e2b.app");
    vi.mocked(Sandbox.connect).mockResolvedValue(mockSandboxInstance as any);

    const result = await executeFragment("sandbox-abc-123", validFragment);

    expect(result).toHaveProperty("sandboxId");
    expect(result).toHaveProperty("url");
  });
});
