import { registerRoutes } from "@convex-dev/stripe";
import { httpRouter } from "convex/server";

import { components, internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { resend } from "./email";

// Hardcoded: Convex httpAction runs in V8 runtime — no process.env access. Update on domain change.
const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://localhost:3001",
  "https://bridges-vibeathon.vercel.app",
  "https://bridgeai-iota.vercel.app",
  "https://vocali.health",
  "https://www.vocali.health",
]);

function getCorsOrigin(request: Request): string {
  const origin = request.headers.get("Origin") ?? "";
  return ALLOWED_ORIGINS.has(origin) ? origin : "";
}

const http = httpRouter();

http.route({
  path: "/api/rag/search",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json().catch(() => ({}));
    const query = body?.query;

    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = await ctx.runAction(
      internal.knowledge.search.searchKnowledgeAction,
      {
        query,
        category: body.category,
        limit: body.limit,
      }
    );

    return new Response(JSON.stringify({ result }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": getCorsOrigin(request),
      },
    });
  }),
});

http.route({
  path: "/api/rag/search",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": getCorsOrigin(request),
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

http.route({
  path: "/resend-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    return await resend.handleResendEventWebhook(ctx, request);
  }),
});

// Stripe webhook — @convex-dev/stripe handles signature verification and event dispatch
registerRoutes(http, components.stripe, {
  webhookPath: "/stripe/webhook",
});

export default http;
