import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";
import { createTestUser } from "./testHelpers";

const modules = import.meta.glob("../**/*.*s");

describe("practiceProfile.update", () => {
  it("creates a new practice profile for SLP", async () => {
    const t = convexTest(schema, modules);
    const { identity: slpIdentity } = await createTestUser(t, "slp");
    const slp = t.withIdentity(slpIdentity);

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
    const { identity: slpIdentity } = await createTestUser(t, "slp");
    const slp = t.withIdentity(slpIdentity);

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
    // Must be a real users row with role: "caregiver" so assertSLP throws
    const { identity: caregiverIdentity } = await createTestUser(t, "caregiver");
    const caregiver = t.withIdentity(caregiverIdentity);

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
    const { identity: slpIdentity } = await createTestUser(t, "slp");
    const slp = t.withIdentity(slpIdentity);

    const profile = await slp.query(api.practiceProfile.get, {});
    expect(profile).toBeNull();
  });
});

describe("practiceProfile.getBySlpId", () => {
  it("returns profile for given SLP user ID", async () => {
    const t = convexTest(schema, modules);
    const { userId: slpUserId, identity: slpIdentity } = await createTestUser(t, "slp");
    const slp = t.withIdentity(slpIdentity);

    await slp.mutation(api.practiceProfile.update, {
      practiceName: "Springfield Speech Center",
    });

    const profile = await t.query(api.practiceProfile.getBySlpId, {
      slpUserId,
    });
    expect(profile).not.toBeNull();
    expect(profile!.practiceName).toBe("Springfield Speech Center");
  });
});
