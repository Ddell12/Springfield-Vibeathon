import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";

import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { patientId } = await params;

  let childName = "Activities";
  try {
    const firstName = await convex.query(api.patients.getPublicFirstName, {
      patientId: patientId as Id<"patients">,
    });
    if (firstName) childName = `${firstName}'s Activities`;
  } catch {
    // Fallback to generic name
  }

  const manifest = {
    name: childName,
    short_name: childName.replace("'s Activities", ""),
    start_url: `/family/${patientId}/play`,
    scope: `/family/${patientId}/play`,
    display: "standalone",
    theme_color: "#0d7377",
    background_color: "#faf8f5",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
