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
  commands: { run: vi.fn() },
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

const viteFragment: FragmentResult = {
  title: "Token Board",
  description: "A token reward board for children",
  template: "vite-therapy",
  code: 'export default function App() { return <div>Token Board</div>; }',
  file_path: "src/App.tsx",
  has_additional_dependencies: false,
  port: 5173,
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
    vi.mocked(Sandbox.create).mockResolvedValue(mockSandboxInstance as ReturnType<typeof vi.fn> & typeof mockSandboxInstance);

    await createSandbox(validFragment);

    expect(Sandbox.create).toHaveBeenCalledWith(
      validFragment.template,
      expect.anything()
    );
  });

  it("writes the fragment code to the correct file path", async () => {
    const { Sandbox } = await import("@e2b/code-interpreter");
    mockGetHost.mockReturnValue("sandbox-abc-123-3000.e2b.app");
    vi.mocked(Sandbox.create).mockResolvedValue(mockSandboxInstance as ReturnType<typeof vi.fn> & typeof mockSandboxInstance);

    await createSandbox(validFragment);

    expect(mockWriteFile).toHaveBeenCalledWith(
      validFragment.file_path,
      validFragment.code
    );
  });

  it("returns a sandboxId and url", async () => {
    const { Sandbox } = await import("@e2b/code-interpreter");
    mockGetHost.mockReturnValue("sandbox-abc-123-3000.e2b.app");
    vi.mocked(Sandbox.create).mockResolvedValue(mockSandboxInstance as ReturnType<typeof vi.fn> & typeof mockSandboxInstance);

    const result = await createSandbox(validFragment);

    expect(result).toHaveProperty("sandboxId");
    expect(result).toHaveProperty("url");
    expect(typeof result.sandboxId).toBe("string");
    expect(typeof result.url).toBe("string");
  });

  it("returns the sandbox id from the created sandbox", async () => {
    const { Sandbox } = await import("@e2b/code-interpreter");
    mockGetHost.mockReturnValue("sandbox-abc-123-3000.e2b.app");
    vi.mocked(Sandbox.create).mockResolvedValue(mockSandboxInstance as ReturnType<typeof vi.fn> & typeof mockSandboxInstance);

    const result = await createSandbox(validFragment);

    expect(result.sandboxId).toBe("sandbox-abc-123");
  });
});

describe("createSandbox — vite-therapy template", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls Sandbox.create with vite-therapy template for vite fragments", async () => {
    const { Sandbox } = await import("@e2b/code-interpreter");
    mockGetHost.mockReturnValue("sandbox-vite-123-5173.e2b.app");
    vi.mocked(Sandbox.create).mockResolvedValue(mockSandboxInstance as ReturnType<typeof vi.fn> & typeof mockSandboxInstance);

    await createSandbox(viteFragment);

    expect(Sandbox.create).toHaveBeenCalledWith(
      "vite-therapy",
      expect.anything()
    );
  });

  it("writes code to src/App.tsx for vite fragments", async () => {
    const { Sandbox } = await import("@e2b/code-interpreter");
    mockGetHost.mockReturnValue("sandbox-vite-123-5173.e2b.app");
    vi.mocked(Sandbox.create).mockResolvedValue(mockSandboxInstance as ReturnType<typeof vi.fn> & typeof mockSandboxInstance);

    await createSandbox(viteFragment);

    expect(mockWriteFile).toHaveBeenCalledWith(
      "src/App.tsx",
      expect.any(String)
    );
  });

  it("strips next/image imports when sanitizing for vite", async () => {
    const { Sandbox } = await import("@e2b/code-interpreter");
    mockGetHost.mockReturnValue("sandbox-vite-123-5173.e2b.app");
    vi.mocked(Sandbox.create).mockResolvedValue(mockSandboxInstance as ReturnType<typeof vi.fn> & typeof mockSandboxInstance);

    const nextjsStyleFragment: FragmentResult = {
      ...viteFragment,
      code: `import Image from 'next/image';\nimport Link from 'next/link';\n"use client";\nexport default function App() { return <div>Hello</div>; }`,
    };

    await createSandbox(nextjsStyleFragment);

    const writtenCode = mockWriteFile.mock.calls[0]?.[1] as string;
    expect(writtenCode).not.toContain("next/image");
    expect(writtenCode).not.toContain("next/link");
    expect(writtenCode).not.toContain('"use client"');
  });
});

describe("executeFragment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("connects to an existing sandbox and updates the code file", async () => {
    const { Sandbox } = await import("@e2b/code-interpreter");
    mockGetHost.mockReturnValue("sandbox-abc-123-3000.e2b.app");
    vi.mocked(Sandbox.connect).mockResolvedValue(mockSandboxInstance as ReturnType<typeof vi.fn> & typeof mockSandboxInstance);

    await executeFragment("sandbox-abc-123", validFragment);

    expect(mockWriteFile).toHaveBeenCalledWith(
      validFragment.file_path,
      validFragment.code
    );
  });

  it("returns a sandboxId and url", async () => {
    const { Sandbox } = await import("@e2b/code-interpreter");
    mockGetHost.mockReturnValue("sandbox-abc-123-3000.e2b.app");
    vi.mocked(Sandbox.connect).mockResolvedValue(mockSandboxInstance as ReturnType<typeof vi.fn> & typeof mockSandboxInstance);

    const result = await executeFragment("sandbox-abc-123", validFragment);

    expect(result).toHaveProperty("sandboxId");
    expect(result).toHaveProperty("url");
  });
});
