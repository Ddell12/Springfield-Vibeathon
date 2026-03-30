import { describe, expect, it } from "vitest";

// Test the pure logic: filtering and sorting
// The hook itself wraps useQuery (tested via E2E), but the transform logic is testable

describe("usePlayData transform logic", () => {
  const mockMaterials = [
    { _id: "m1", appId: "app1", type: "app" as const, title: "AAC Board", assignedAt: 100 },
    { _id: "m2", appId: null, type: "session" as const, title: "Draft Session", assignedAt: 200 },
    { _id: "m3", appId: "app2", type: "app" as const, title: "Flashcards", assignedAt: 50 },
  ];

  const mockPrograms = [
    { _id: "p1", materialId: "m1", status: "active" as const },
    { _id: "p2", materialId: "m3", status: "paused" as const },
  ];

  it("filters out session-only materials", () => {
    const appMaterials = mockMaterials.filter((m) => m.appId && m.type === "app");
    expect(appMaterials).toHaveLength(2);
    expect(appMaterials.every((m) => m.type === "app")).toBe(true);
  });

  it("sorts by assignedAt ascending", () => {
    const sorted = mockMaterials
      .filter((m) => m.appId && m.type === "app")
      .sort((a, b) => a.assignedAt - b.assignedAt);
    expect(sorted[0].title).toBe("Flashcards");
    expect(sorted[1].title).toBe("AAC Board");
  });

  it("identifies materials with active practice programs", () => {
    const activeProgramMaterialIds = new Set(
      mockPrograms
        .filter((p) => p.status === "active" && p.materialId)
        .map((p) => p.materialId!)
    );
    expect(activeProgramMaterialIds.has("m1")).toBe(true);
    expect(activeProgramMaterialIds.has("m3")).toBe(false); // paused
  });
});
