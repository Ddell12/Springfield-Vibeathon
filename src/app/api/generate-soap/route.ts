import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";

import {
  buildSoapPrompt,
  parseSoapResponse,
} from "@/features/session-notes/lib/soap-prompt";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { sseEncode } from "../generate/sse";

export const runtime = "nodejs";

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required for /api/generate-soap");
}
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is required for /api/generate-soap");
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request): Promise<Response> {
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const { userId, getToken } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const token = await getToken({ template: "convex" });
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  convex.setAuth(token);

  const { sessionNoteId } = (await request.json()) as {
    sessionNoteId: string;
  };
  const noteId = sessionNoteId as Id<"sessionNotes">;

  // Fetch note first to get patientId, then patient + previous SOAP in parallel
  const note = await convex.query(api.sessionNotes.get, { noteId });
  if (note.status === "signed") {
    return new Response(
      JSON.stringify({ error: "Cannot generate SOAP for a signed note" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const [patientResult, previousNote] = await Promise.all([
    convex.query(api.patients.get, { patientId: note.patientId }),
    convex.query(api.sessionNotes.getLatestSoap, {
      patientId: note.patientId,
    }),
  ]);
  if (!patientResult) {
    return new Response(
      JSON.stringify({ error: "Patient not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }
  const patient = patientResult;

  const previousSoap =
    previousNote && previousNote._id !== noteId && previousNote.soapNote
      ? {
          sessionDate: previousNote.sessionDate,
          soapNote: previousNote.soapNote,
        }
      : null;

  const systemPrompt = buildSoapPrompt(patient, note, previousSoap);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const isAborted = () => request.signal.aborted;
      const send = (eventType: string, data: object) => {
        if (isAborted()) return;
        try {
          controller.enqueue(encoder.encode(sseEncode(eventType, data)));
        } catch {}
      };

      try {
        let fullText = "";
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          temperature: 0.3,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content:
                "Generate the SOAP note for this session based on the data provided.",
            },
          ],
          stream: true,
        });

        for await (const event of response) {
          if (isAborted()) break;
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullText += event.delta.text;
            send("soap-chunk", { text: event.delta.text });
          }
        }

        const parsed = parseSoapResponse(fullText);
        if (parsed) {
          await convex.mutation(api.sessionNotes.saveSoapFromAI, {
            noteId,
            soapNote: parsed,
          });
          send("soap-complete", { soap: parsed });
        } else {
          send("error", { message: "Failed to parse SOAP response" });
        }
      } catch (err) {
        send("error", {
          message: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
