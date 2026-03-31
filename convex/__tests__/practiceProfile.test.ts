import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
const CAREGIVER_IDENTITY = {
  subject: "caregiver-789",
  issuer: "clerk",
  public_metadata: JSON.stringify({ role: "caregiver" }),
};

describe("practiceProfile.update", () => {
  it("creates a new practice profile for SLP", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);

    await slp.mutation(api.practiceProfile.update, {
      practiceName: "Springfield Speech Center",
      npiNumber: "1234567890",
      credentials: "M.S., CCC-SLP",
    });

    const profile = await slp.query(api.practiceProfile.get, {});
    expect(profile).not.toBeNull();
    expect(profile!.practiceName).toBe("Springfield Speech Center");
    expect(profile!.npiNumber).toBe("1234567890");
    expect(profile!.credentials).toBe("M.S., CCC-SLP");
  });

  it("updates an existing practice profile", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);

    await slp.mutation(api.practiceProfile.update, {
      practiceName: "Old Name",
    });
    await slp.mutation(api.practiceProfile.update, {
      practiceName: "New Name",
      licenseState: "IL",
    });

    const profile = await slp.query(api.practiceProfile.get, {});
    expect(profile!.practiceName).toBe("New Name");
    expect(profile!.licenseState).toBe("IL");
  });

  it("rejects caregiver users", async () => {
    const t = convexTest(schema, modules);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    await expect(
      caregiver.mutation(api.practiceProfile.update, {
        practiceName: "Hacker Practice",
      })
    ).rejects.toThrow();
  });
});

describe("practiceProfile.get", () => {
  it("returns null when no profile exists", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);

    const profile = await slp.query(api.practiceProfile.get, {});
    expect(profile).toBeNull();
  });
});

describe("practiceProfile.getBySlpId", () => {
  it("returns profile for given SLP user ID", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);

    await slp.mutation(api.practiceProfile.update, {
      practiceName: "Springfield Speech Center",
    });

    const profile = await t.query(api.practiceProfile.getBySlpId, {
      slpUserId: "slp-user-123",
    });
    expect(profile).not.toBeNull();
    expect(profile!.practiceName).toBe("Springfield Speech Center");
  });
});
