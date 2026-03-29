import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

describe("schema and auth foundation", () => {
  it("homePrograms table exists in schema", () => {
    expect(schema.tables.homePrograms).toBeDefined();
    expect(schema.tables.practiceLog).toBeDefined();
    expect(schema.tables.patientMessages).toBeDefined();
  });
});
