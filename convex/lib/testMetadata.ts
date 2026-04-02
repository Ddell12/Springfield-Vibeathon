import { v } from "convex/values";

export const testMetadataValidator = v.object({
  source: v.union(
    v.literal("developer-shortcut"),
    v.literal("seed-demo"),
    v.literal("seed-e2e"),
  ),
  createdByUserId: v.optional(v.string()),
  expiresAt: v.optional(v.number()),
});

export type TestMetadata = {
  source: "developer-shortcut" | "seed-demo" | "seed-e2e";
  createdByUserId?: string;
  expiresAt?: number;
};

export function buildDeveloperTestMetadata(userId: string, now = Date.now()) {
  return {
    source: "developer-shortcut" as const,
    createdByUserId: userId,
    expiresAt: now + 30 * 24 * 60 * 60 * 1000,
  };
}
