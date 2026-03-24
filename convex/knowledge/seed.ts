"use node";

import { google } from "@ai-sdk/google";
import { RAG } from "@convex-dev/rag";

import { components } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { KNOWLEDGE_ENTRIES } from "./data";

export const rag = new RAG(components.rag, {
  embeddingDimension: 768,
  textEmbeddingModel: google.textEmbeddingModel("gemini-embedding-001"),
  filterNames: ["category"],
});

export const seedKnowledge = internalAction({
  args: {},
  handler: async (ctx): Promise<{ added: number }> => {
    let added = 0;
    for (const entry of KNOWLEDGE_ENTRIES) {
      await rag.add(ctx, {
        namespace: "therapy-knowledge",
        key: entry.title,
        title: entry.title,
        text: entry.content,
        filterValues: [{ name: "category", value: entry.category }],
      });
      added++;
    }
    return { added };
  },
});
