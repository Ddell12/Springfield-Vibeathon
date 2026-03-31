/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

describe("billingRecords schema", () => {
  it("billingRecords table exists in schema", () => {
    expect(schema.tables.billingRecords).toBeDefined();
  });
});
