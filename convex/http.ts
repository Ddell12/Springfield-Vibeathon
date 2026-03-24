import { httpRouter } from "convex/server";

import { httpAction } from "./_generated/server";
import { ragSearch } from "./knowledge/http";

const http = httpRouter();

http.route({
  path: "/api/rag/search",
  method: "POST",
  handler: ragSearch,
});

http.route({
  path: "/api/rag/search",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, _request) => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

export default http;
