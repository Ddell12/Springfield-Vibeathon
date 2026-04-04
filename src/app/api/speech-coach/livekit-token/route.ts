import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

import { authenticate } from "@/app/api/lib/authenticate";

export async function POST(req: Request): Promise<Response> {
  const { userId } = await authenticate();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = (await req.json()) as {
    roomName?: string;
    participantName?: string;
    roomMetadata?: string;
  };

  const { roomName, participantName, roomMetadata } = body;

  if (!roomName || !participantName) {
    return new Response(
      JSON.stringify({ error: "roomName and participantName are required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return new Response(
      JSON.stringify({ error: "LiveKit credentials not configured" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!serverUrl) {
    return new Response(JSON.stringify({ error: "LiveKit server URL not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const roomService = new RoomServiceClient(serverUrl, apiKey, apiSecret);
  try {
    await roomService.createRoom({
      name: roomName,
      metadata: roomMetadata ?? "",
    });
  } catch {
    if (roomMetadata !== undefined) {
      await roomService.updateRoomMetadata(roomName, roomMetadata);
    }
  }

  const sanitizedName = participantName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);

  const at = new AccessToken(apiKey, apiSecret, {
    identity: sanitizedName,
    ttl: "30m",
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return Response.json({ token: await at.toJwt(), serverUrl });
}
