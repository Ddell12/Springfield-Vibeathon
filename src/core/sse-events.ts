// Typed SSE event discriminated union and parser for the streaming builder

export type SSEEvent =
  | { event: "session"; sessionId: string }
  | { event: "status"; status: "generating" | "bundling" | "live" | "failed"; message?: string }
  | { event: "token"; token: string }
  | { event: "activity"; type: "thinking" | "writing_file" | "file_written" | "complete"; message: string; path?: string }
  | { event: "file_complete"; path: string; contents?: string }
  | { event: "app_name"; name: string }
  | { event: "blueprint"; data: unknown }
  | { event: "image_generated"; label: string; imageUrl: string }
  | { event: "speech_generated"; text: string; audioUrl: string }
  | { event: "stt_enabled"; purpose: string }
  | { event: "bundle"; html: string }
  | { event: "done"; sessionId?: string; files?: Array<{ path: string; contents: string }> }
  | { event: "error"; message: string };

/**
 * Parse a raw SSE event + data into a typed SSEEvent.
 * Returns null for unrecognised event types so callers can skip them.
 */
export function parseSSEEvent(event: string, data: unknown): SSEEvent | null {
  const d = data as Record<string, unknown>;
  switch (event) {
    case "session":
      return { event: "session", sessionId: String(d.sessionId ?? "") };
    case "status":
      return { event: "status", status: d.status as "generating" | "bundling" | "live" | "failed", message: d.message as string | undefined };
    case "token":
      return { event: "token", token: String(d.token ?? "") };
    case "activity":
      return { event: "activity", type: d.type as "thinking" | "writing_file" | "file_written" | "complete", message: String(d.message ?? ""), path: d.path as string | undefined };
    case "file_complete":
      return { event: "file_complete", path: String(d.path ?? ""), contents: String(d.contents ?? "") };
    case "app_name":
      return { event: "app_name", name: String(d.name ?? "") };
    case "blueprint":
      return { event: "blueprint", data: d };
    case "image_generated":
      return { event: "image_generated", label: String(d.label ?? ""), imageUrl: String(d.imageUrl ?? "") };
    case "speech_generated":
      return { event: "speech_generated", text: String(d.text ?? ""), audioUrl: String(d.audioUrl ?? "") };
    case "stt_enabled":
      return { event: "stt_enabled", purpose: String(d.purpose ?? "") };
    case "bundle":
      return { event: "bundle", html: String(d.html ?? "") };
    case "done":
      return { event: "done", sessionId: d.sessionId as string | undefined, files: d.files as Array<{ path: string; contents: string }> | undefined };
    case "error":
      return { event: "error", message: String(d.message ?? "Unknown error") };
    default:
      return null;
  }
}
