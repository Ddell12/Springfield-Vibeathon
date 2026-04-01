import { AccessToken } from "livekit-server-sdk";

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as {
    roomName?: string;
    participantName?: string;
  };

  const { roomName, participantName } = body;

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

  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
    ttl: "30m",
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return Response.json({
    token: await at.toJwt(),
    serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL,
  });
}
