import { ConvexHttpClient } from "convex/browser";

import { api } from "../../../../../convex/_generated/api";

function getConvexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  return new ConvexHttpClient(url);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const convex = getConvexClient();
    const html = await convex.query(api.generated_files.getPublicBundle, {
      shareSlug: slug,
    });

    if (!html) {
      return new Response("Not found", { status: 404 });
    }

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60, s-maxage=300",
      },
    });
  } catch (error) {
    console.error("[api/tool] Failed to serve bundle:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
