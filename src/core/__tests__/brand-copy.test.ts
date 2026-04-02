import { describe, expect, it } from "vitest";
import { APP_BRAND, APP_CONTACT_EMAIL, APP_TAGLINE } from "@/core/config";

describe("brand copy", () => {
  it("keeps the public-facing brand constants aligned", () => {
    expect(APP_BRAND).toBe("Vocali");
    expect(APP_TAGLINE).toContain("speech therapy");
    expect(APP_CONTACT_EMAIL).toBe("hello@vocali.ai");
  });
});
