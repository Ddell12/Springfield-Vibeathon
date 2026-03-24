"use node";

import { internal } from "../_generated/api";
import { httpAction } from "../_generated/server";

export const ragSearch = httpAction(async (ctx, request) => {
  const body = await request.json().catch(() => ({}));
  const query = body?.query;

  if (!query || typeof query !== "string") {
    return new Response(JSON.stringify({ error: "query is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = await ctx.runAction(internal.knowledge.search.searchKnowledgeAction, {
    query,
    category: body.category,
    limit: body.limit,
  });

  return new Response(JSON.stringify({ result }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
