import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Convex hooks before imports
vi.mock("convex/react", () => ({
  useConvexAuth: vi.fn(),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock("@convex/_generated/api", () => ({
  api: {
    app_instance_data: {
      getAll: "app_instance_data:getAll",
      getEvents: "app_instance_data:getEvents",
      upsert: "app_instance_data:upsert",
    },
  },
}));

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useTemplateData } from "../use-template-data";

const mockUseConvexAuth = vi.mocked(useConvexAuth);
const mockUseQuery = vi.mocked(useQuery);
const mockUseMutation = vi.mocked(useMutation);
const mockUpsert = vi.fn();

beforeEach(() => {
  mockUseMutation.mockReturnValue(mockUpsert);
  localStorage.clear();
});

describe("useTemplateData — preview mode (Convex path)", () => {
  beforeEach(() => {
    mockUseConvexAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    mockUseQuery.mockReturnValue(undefined); // loading
  });

  it("returns isLoading: true while Convex data is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    const { result } = renderHook(() =>
      useTemplateData("app123" as never, "preview")
    );
    expect(result.current.isLoading).toBe(true);
  });

  it("returns isLoading: false when Convex data resolves", () => {
    mockUseQuery.mockImplementation((query) => {
      if (String(query).includes("getAll")) return [];
      if (String(query).includes("getEvents")) return [];
      return undefined;
    });
    const { result } = renderHook(() =>
      useTemplateData("app123" as never, "preview")
    );
    expect(result.current.isLoading).toBe(false);
  });

  it("get() returns fallback when key not in Convex data", () => {
    mockUseQuery.mockImplementation((query) => {
      if (String(query).includes("getAll")) return [];
      if (String(query).includes("getEvents")) return [];
      return undefined;
    });
    const { result } = renderHook(() =>
      useTemplateData("app123" as never, "preview")
    );
    expect(result.current.get("missing", "default")).toBe("default");
  });

  it("get() returns parsed value from Convex data when key exists", () => {
    mockUseQuery.mockImplementation((query) => {
      if (String(query).includes("getAll"))
        return [{ key: "myKey", valueJson: '"stored-value"', _id: "1", _creationTime: 0 }];
      if (String(query).includes("getEvents")) return [];
      return undefined;
    });
    const { result } = renderHook(() =>
      useTemplateData("app123" as never, "preview")
    );
    expect(result.current.get("myKey", "default")).toBe("stored-value");
  });

  it("set() calls the upsert mutation", () => {
    mockUseQuery.mockImplementation((query) => {
      if (String(query).includes("getAll")) return [];
      if (String(query).includes("getEvents")) return [];
      return undefined;
    });
    const { result } = renderHook(() =>
      useTemplateData("app123" as never, "preview")
    );
    result.current.set("myKey", { value: 42 });
    expect(mockUpsert).toHaveBeenCalledWith({
      appInstanceId: "app123",
      key: "myKey",
      valueJson: JSON.stringify({ value: 42 }),
    });
  });

  it("history.sessionCount counts app_opened events", () => {
    mockUseQuery.mockImplementation((query) => {
      if (String(query).includes("getAll")) return [];
      if (String(query).includes("getEvents"))
        return [
          { eventType: "app_opened", _id: "1", _creationTime: 1000, appInstanceId: "app123" },
          { eventType: "item_tapped", _id: "2", _creationTime: 2000, appInstanceId: "app123" },
          { eventType: "app_opened", _id: "3", _creationTime: 3000, appInstanceId: "app123" },
        ];
      return undefined;
    });
    const { result } = renderHook(() =>
      useTemplateData("app123" as never, "preview")
    );
    expect(result.current.history.sessionCount).toBe(2);
  });

  it("history.lastUsedAt is the max _creationTime", () => {
    mockUseQuery.mockImplementation((query) => {
      if (String(query).includes("getAll")) return [];
      if (String(query).includes("getEvents"))
        return [
          { eventType: "app_opened", _id: "1", _creationTime: 1000, appInstanceId: "app123" },
          { eventType: "item_tapped", _id: "2", _creationTime: 5000, appInstanceId: "app123" },
        ];
      return undefined;
    });
    const { result } = renderHook(() =>
      useTemplateData("app123" as never, "preview")
    );
    expect(result.current.history.lastUsedAt).toBe(5000);
  });
});

describe("useTemplateData — published + unauthenticated (localStorage path)", () => {
  beforeEach(() => {
    mockUseConvexAuth.mockReturnValue({ isAuthenticated: false, isLoading: false });
    mockUseQuery.mockReturnValue(undefined);
  });

  it("isLoading is false (localStorage is sync)", () => {
    const { result } = renderHook(() =>
      useTemplateData("app123" as never, "published")
    );
    expect(result.current.isLoading).toBe(false);
  });

  it("get() returns fallback when localStorage key missing", () => {
    const { result } = renderHook(() =>
      useTemplateData("app123" as never, "published")
    );
    expect(result.current.get("nope", 99)).toBe(99);
  });

  it("set() writes to localStorage and get() reads it back", () => {
    const { result } = renderHook(() =>
      useTemplateData("app123" as never, "published")
    );
    result.current.set("greeting", "hello");
    expect(result.current.get("greeting", "")).toBe("hello");
  });

  it("history.events is empty for anonymous users", () => {
    const { result } = renderHook(() =>
      useTemplateData("app123" as never, "published")
    );
    expect(result.current.history.events).toEqual([]);
    expect(result.current.history.sessionCount).toBe(0);
    expect(result.current.history.lastUsedAt).toBeNull();
  });
});
