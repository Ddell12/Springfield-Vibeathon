// convex/__tests__/image_cache.test.ts
// image_cache functions are ALL internal (internalQuery / internalMutation)
// so we use t.run() for direct DB access instead of api/internal refs in convex-test.
// storageId requires a real storage entry — use ctx.storage.store() to generate valid IDs.
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import schema from "../schema";

const modules = import.meta.glob("../**/*.*s"); // REQUIRED for convex-test

/** Helper: insert a fake PNG blob into storage and return a valid storageId */
async function storeTestImage(ctx: { storage: { store: (blob: Blob) => Promise<string> } }) {
  // Minimal 1x1 transparent PNG bytes
  const pngBytes = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  const blob = new Blob([pngBytes], { type: "image/png" });
  return await ctx.storage.store(blob);
}

describe("image_cache", () => {
  it("returns null for unknown hash", async () => {
    const t = convexTest(schema, modules);
    const result = await t.run(async (ctx) => {
      return await ctx.db
        .query("imageCache")
        .withIndex("by_promptHash", (q) => q.eq("promptHash", "unknown_hash_xyz"))
        .first();
    });
    expect(result).toBeNull();
  });

  it("save and retrieve by promptHash", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const storageId = await storeTestImage(ctx as any);
      await ctx.db.insert("imageCache", {
        promptHash: "abc123",
        prompt: "a happy child smiling",
        label: "happy",
        category: "emotions",
        storageId: storageId as any,
        imageUrl: "https://example.com/img.png",
        model: "test-model",
        createdAt: Date.now(),
      });
    });
    const result = await t.run(async (ctx) => {
      return await ctx.db
        .query("imageCache")
        .withIndex("by_promptHash", (q) => q.eq("promptHash", "abc123"))
        .first();
    });
    expect(result).not.toBeNull();
    expect(result?.label).toBe("happy");
    expect(result?.category).toBe("emotions");
    expect(result?.imageUrl).toBe("https://example.com/img.png");
  });

  it("retrieve by label and category index", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const storageId = await storeTestImage(ctx as any);
      await ctx.db.insert("imageCache", {
        promptHash: "def456",
        prompt: "a dog playing fetch",
        label: "dog",
        category: "animals",
        storageId: storageId as any,
        imageUrl: "https://example.com/dog.png",
        model: "test-model",
        createdAt: Date.now(),
      });
    });
    const result = await t.run(async (ctx) => {
      return await ctx.db
        .query("imageCache")
        .withIndex("by_label_category", (q) =>
          q.eq("label", "dog").eq("category", "animals")
        )
        .first();
    });
    expect(result).not.toBeNull();
    expect(result?.prompt).toBe("a dog playing fetch");
  });

  it("count returns 0 when empty", async () => {
    const t = convexTest(schema, modules);
    const result = await t.run(async (ctx) => {
      const entries = await ctx.db.query("imageCache").take(1);
      return entries.length;
    });
    expect(result).toBe(0);
  });

  it("count reflects inserted entries", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const storageId1 = await storeTestImage(ctx as any);
      await ctx.db.insert("imageCache", {
        promptHash: "hash1",
        prompt: "prompt one",
        label: "label1",
        category: "emotions",
        storageId: storageId1 as any,
        imageUrl: "https://example.com/1.png",
        model: "test-model",
        createdAt: Date.now(),
      });
      const storageId2 = await storeTestImage(ctx as any);
      await ctx.db.insert("imageCache", {
        promptHash: "hash2",
        prompt: "prompt two",
        label: "label2",
        category: "animals",
        storageId: storageId2 as any,
        imageUrl: "https://example.com/2.png",
        model: "test-model",
        createdAt: Date.now(),
      });
    });
    const count = await t.run(async (ctx) => {
      const entries = await ctx.db.query("imageCache").collect();
      return entries.length;
    });
    expect(count).toBe(2);
  });
});
