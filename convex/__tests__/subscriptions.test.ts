import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob("../**/*.*s"); // REQUIRED for convex-test

describe("subscriptions.getEntitlements", () => {
  it("returns free plan when user has no subscription", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.entitlements.getEntitlements, {});
    expect(result.plan).toBe("free");
    expect(result.limits.maxApps).toBe(5);
    expect(result.limits.maxDecks).toBe(10);
  });

  // Skipped: convex-test cannot mock component queries (components.stripe.public.*)
  // The authenticated path calls ctx.runQuery on the stripe component which requires
  // t.registerComponent("stripe") — not yet supported by convex-test.
  it.skip("returns free plan for authenticated user with no subscription", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ subject: "user_123", issuer: "clerk" });
    const result = await asUser.query(api.entitlements.getEntitlements, {});
    expect(result.plan).toBe("free");
  });
});
