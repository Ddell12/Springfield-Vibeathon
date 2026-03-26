import { renderHook } from "@testing-library/react";

// Mock convex/react before importing the hooks
const mockUseQuery = vi.fn().mockReturnValue(undefined);
vi.mock("convex/react", () => ({
  useQuery: mockUseQuery,
}));

// Mock the generated api to avoid Convex's anyApi Proxy (throws on Symbol access)
// Path: test file is at src/features/builder/hooks/__tests__/ → 5 levels up to project root
vi.mock("../../../../../convex/_generated/api", () => ({
  api: {
    sessions: { get: "api.sessions.get" },
    messages: { list: "api.messages.list" },
    generated_files: { list: "api.generated_files.list" },
  },
}));

import { useSession, useSessionFiles, useSessionMessages } from "../use-session";
import type { Id } from "../../../../../convex/_generated/dataModel";

const SESSION_ID = "session_abc123" as Id<"sessions">;

describe("useSession", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue(undefined);
  });

  it("calls useQuery with { sessionId } when sessionId is provided", () => {
    renderHook(() => useSession(SESSION_ID));
    // In React StrictMode renderHook may call twice; use lastCall
    const lastCall = mockUseQuery.mock.calls.at(-1)!;
    expect(lastCall[0]).toBe("api.sessions.get");
    expect(lastCall[1]).toEqual({ sessionId: SESSION_ID });
  });

  it("calls useQuery with 'skip' when sessionId is null", () => {
    renderHook(() => useSession(null));
    const lastCall = mockUseQuery.mock.calls.at(-1)!;
    expect(lastCall[0]).toBe("api.sessions.get");
    expect(lastCall[1]).toBe("skip");
  });

  it("returns the value from useQuery", () => {
    const fakeSession = { _id: SESSION_ID, status: "complete" };
    mockUseQuery.mockReturnValue(fakeSession);
    const { result } = renderHook(() => useSession(SESSION_ID));
    expect(result.current).toBe(fakeSession);
  });
});

describe("useSessionMessages", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue(undefined);
  });

  it("calls useQuery with { sessionId } when sessionId is provided", () => {
    renderHook(() => useSessionMessages(SESSION_ID));
    const lastCall = mockUseQuery.mock.calls.at(-1)!;
    expect(lastCall[0]).toBe("api.messages.list");
    expect(lastCall[1]).toEqual({ sessionId: SESSION_ID });
  });

  it("calls useQuery with 'skip' when sessionId is null", () => {
    renderHook(() => useSessionMessages(null));
    const lastCall = mockUseQuery.mock.calls.at(-1)!;
    expect(lastCall[0]).toBe("api.messages.list");
    expect(lastCall[1]).toBe("skip");
  });
});

describe("useSessionFiles", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue(undefined);
  });

  it("calls useQuery with { sessionId } when sessionId is provided", () => {
    renderHook(() => useSessionFiles(SESSION_ID));
    const lastCall = mockUseQuery.mock.calls.at(-1)!;
    expect(lastCall[0]).toBe("api.generated_files.list");
    expect(lastCall[1]).toEqual({ sessionId: SESSION_ID });
  });

  it("calls useQuery with 'skip' when sessionId is null", () => {
    renderHook(() => useSessionFiles(null));
    const lastCall = mockUseQuery.mock.calls.at(-1)!;
    expect(lastCall[0]).toBe("api.generated_files.list");
    expect(lastCall[1]).toBe("skip");
  });
});
