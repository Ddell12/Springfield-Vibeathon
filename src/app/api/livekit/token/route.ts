import { AccessToken } from "livekit-server-sdk";

import { authenticate } from "@/app/api/generate/lib/authenticate";

import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

/** Appointment statuses that allow issuing a LiveKit room token. */
const JOINABLE_STATUSES = new Set(["scheduled", "in-progress"]);

export async function POST(req: Request): Promise<Response> {
  const { convex, userId } = await authenticate();
  if (!userId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { appointmentId } = body as { appointmentId?: string };

  if (!appointmentId) {
    return Response.json({ error: "appointmentId required" }, { status: 400 });
  }

  let appointment;
  try {
    appointment = await convex.query(api.appointments.get, {
      appointmentId: appointmentId as Id<"appointments">,
    });
  } catch (err) {
    console.error("[livekit/token] Convex query failed — userId:", userId, "appointmentId:", appointmentId, "error:", err);
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  if (!appointment) {
    return Response.json({ error: "Appointment not found" }, { status: 404 });
  }

  // Status gate: only scheduled or in-progress appointments can be joined.
  if (!JOINABLE_STATUSES.has(appointment.status)) {
    return Response.json(
      {
        error: `Appointment is ${appointment.status} and not joinable`,
      },
      { status: 403 },
    );
  }

  // Check 2: SLP ownership
  const isSlp = userId === appointment.slpId;

  if (!isSlp) {
    // Check 3: Caregiver link
    let hasLink: boolean;
    try {
      hasLink = await convex.query(api.caregivers.hasAcceptedLinkForPatient, {
        patientId: appointment.patientId,
      });
    } catch (err) {
      console.error("[livekit/token] Caregiver link check failed", { userId, appointmentId, err });
      return Response.json({ error: "Not authorized" }, { status: 403 });
    }

    if (!hasLink) {
      console.warn("[livekit/token] Unauthorized join attempt", { userId, appointmentId });
      return Response.json({ error: "Not authorized for this appointment" }, { status: 403 });
    }
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!apiKey || !apiSecret || !serverUrl) {
    return Response.json({ error: "LiveKit not configured" }, { status: 500 });
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: userId,
    ttl: "2h",
  });

  at.addGrant({
    roomJoin: true,
    room: `session-${appointmentId}`,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();

  return Response.json({ token, serverUrl });
}
