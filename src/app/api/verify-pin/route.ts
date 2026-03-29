import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { auth } from "@clerk/nextjs/server";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

export async function POST(request: NextRequest) {
  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });
  if (!token) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  const body = await request.json();
  const { patientId, pin } = body as { patientId?: string; pin?: string };

  if (!patientId || !pin) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  try {
    const convex = new ConvexHttpClient(CONVEX_URL);
    convex.setAuth(token);
    const valid = await convex.mutation(api.childApps.verifyPIN, {
      patientId: patientId as Id<"patients">,
      pin,
    });
    return NextResponse.json({ valid });
  } catch {
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
