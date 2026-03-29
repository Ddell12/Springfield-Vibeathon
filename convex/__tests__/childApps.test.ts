import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

describe("childApps schema", () => {
  it("childApps table exists in schema", () => {
    expect(schema.tables.childApps).toBeDefined();
  });

  it("caregiverLinks accepts kidModePIN field", async () => {
    const t = convexTest(schema, modules);
    const slpId = { subject: "slp-1", issuer: "clerk" };
    const slp = t.withIdentity(slpId);

    const { patientId } = await slp.mutation(api.patients.create, {
      firstName: "Test",
      lastName: "Child",
      dateOfBirth: "2020-01-01",
      diagnosis: "articulation" as const,
    });

    const linkId = await t.run(async (ctx) => {
      return await ctx.db.insert("caregiverLinks", {
        patientId,
        email: "parent@test.com",
        inviteToken: "test-token-12345678",
        inviteStatus: "pending",
        kidModePIN: "hashed-pin-value",
      });
    });
    const link = await t.run(async (ctx) => ctx.db.get(linkId));
    expect(link?.kidModePIN).toBe("hashed-pin-value");
  });
});
