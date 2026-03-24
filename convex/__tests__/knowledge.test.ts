/**
 * Tests for convex/knowledge/data.ts — static KNOWLEDGE_ENTRIES data validation.
 *
 * IMPORTANT: seedKnowledge and searchKnowledgeAction call external APIs
 * (Google embeddings via RAG) and cannot be tested with convex-test's mock
 * runtime. These tests are pure TypeScript structural/data validation tests
 * that import the static data array directly — no Convex runtime involved.
 *
 * Contracts for actions tested structurally via comment below.
 */

import { describe, expect, test } from "vitest";

import { KNOWLEDGE_ENTRIES, type KnowledgeEntry } from "../knowledge/data";

describe("KNOWLEDGE_ENTRIES data validation", () => {
  test("KNOWLEDGE_ENTRIES has 100 or more entries", () => {
    expect(KNOWLEDGE_ENTRIES.length).toBeGreaterThanOrEqual(100);
  });

  test("KNOWLEDGE_ENTRIES covers all 5 categories with at least 20 each", () => {
    const categories = [
      "aba-terminology",
      "speech-therapy",
      "tool-patterns",
      "developmental-milestones",
      "iep-goals",
    ];

    const counts: Record<string, number> = {};
    for (const entry of KNOWLEDGE_ENTRIES) {
      counts[entry.category] = (counts[entry.category] ?? 0) + 1;
    }

    for (const category of categories) {
      expect(counts[category]).toBeGreaterThanOrEqual(20);
    }
  });

  test("KNOWLEDGE_ENTRIES entries have required fields", () => {
    for (const entry of KNOWLEDGE_ENTRIES) {
      expect(typeof entry.title).toBe("string");
      expect(entry.title.trim().length).toBeGreaterThan(0);

      expect(typeof entry.content).toBe("string");
      expect(entry.content.trim().length).toBeGreaterThan(0);

      expect(typeof entry.category).toBe("string");
      expect(entry.category.trim().length).toBeGreaterThan(0);
    }
  });

  test("each entry content is 2-5 sentences", () => {
    for (const entry of KNOWLEDGE_ENTRIES) {
      // Count sentence-ending punctuation as a proxy for sentence count
      const sentenceMatches = entry.content.match(/[.!?]/g);
      const sentenceCount = sentenceMatches ? sentenceMatches.length : 0;
      expect(sentenceCount).toBeGreaterThanOrEqual(2);
      expect(sentenceCount).toBeLessThanOrEqual(5);
    }
  });

  test("no duplicate titles in KNOWLEDGE_ENTRIES", () => {
    const titles = KNOWLEDGE_ENTRIES.map((e: KnowledgeEntry) => e.title);
    const uniqueTitles = new Set(titles);
    expect(uniqueTitles.size).toBe(titles.length);
  });
});

/**
 * seedKnowledge action (convex/knowledge/seed.ts)
 * ───────────────────────────────────────────────────
 * Contract (not testable with convex-test mock runtime — requires real Google
 * embeddings API):
 *
 * 1. Iterates over KNOWLEDGE_ENTRIES and upserts each entry into the RAG
 *    knowledge base using the entry's `title` as the key (idempotent).
 * 2. Uses rag.add() with namespace "therapy-knowledge" and filterValues for category.
 * 3. Returns { added: number } with the count of entries processed.
 *
 * Args: {} (no arguments)
 * Returns: { added: number }
 *
 * searchKnowledgeAction action (convex/knowledge/search.ts)
 * ───────────────────────────────────────────────────────────
 * Contract:
 *
 * 1. Accepts a `query` string, optional `category` filter, and optional `limit` (default 5).
 * 2. Calls rag.search() which generates embedding via Google gemini-embedding-001.
 * 3. Returns the pre-formatted `text` field from RAG results as a string.
 *
 * Args: { query: string; category?: string; limit?: number }
 * Returns: string (formatted knowledge context)
 */
