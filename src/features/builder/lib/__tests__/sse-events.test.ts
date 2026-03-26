import { parseSSEEvent } from "../sse-events";

describe("parseSSEEvent", () => {
  it("parses session event", () => {
    const result = parseSSEEvent("session", { sessionId: "sess_abc" });
    expect(result).toEqual({ event: "session", sessionId: "sess_abc" });
  });

  it("parses session event with missing sessionId (nullish fallback)", () => {
    const result = parseSSEEvent("session", {});
    expect(result).toEqual({ event: "session", sessionId: "" });
  });

  it("parses status event with message", () => {
    const result = parseSSEEvent("status", { status: "generating", message: "Building..." });
    expect(result).toEqual({ event: "status", status: "generating", message: "Building..." });
  });

  it("parses status event without message", () => {
    const result = parseSSEEvent("status", { status: "live" });
    expect(result).toEqual({ event: "status", status: "live", message: undefined });
  });

  it("parses token event", () => {
    const result = parseSSEEvent("token", { token: "Hello" });
    expect(result).toEqual({ event: "token", token: "Hello" });
  });

  it("parses token event with missing token (nullish fallback)", () => {
    const result = parseSSEEvent("token", {});
    expect(result).toEqual({ event: "token", token: "" });
  });

  it("parses activity event with path", () => {
    const result = parseSSEEvent("activity", {
      type: "writing_file",
      message: "Writing App.tsx",
      path: "src/App.tsx",
    });
    expect(result).toEqual({
      event: "activity",
      type: "writing_file",
      message: "Writing App.tsx",
      path: "src/App.tsx",
    });
  });

  it("parses activity event without path", () => {
    const result = parseSSEEvent("activity", { type: "thinking", message: "Planning..." });
    expect(result).toEqual({
      event: "activity",
      type: "thinking",
      message: "Planning...",
      path: undefined,
    });
  });

  it("parses activity event with missing message (nullish fallback)", () => {
    const result = parseSSEEvent("activity", { type: "complete" });
    expect(result).toEqual({
      event: "activity",
      type: "complete",
      message: "",
      path: undefined,
    });
  });

  it("parses file_complete event", () => {
    const result = parseSSEEvent("file_complete", {
      path: "src/App.tsx",
      contents: "export default function App() {}",
    });
    expect(result).toEqual({
      event: "file_complete",
      path: "src/App.tsx",
      contents: "export default function App() {}",
    });
  });

  it("parses file_complete event with missing fields (nullish fallback)", () => {
    const result = parseSSEEvent("file_complete", {});
    expect(result).toEqual({ event: "file_complete", path: "", contents: "" });
  });

  it("parses app_name event", () => {
    const result = parseSSEEvent("app_name", { name: "Feelings Board" });
    expect(result).toEqual({ event: "app_name", name: "Feelings Board" });
  });

  it("parses app_name event with missing name (nullish fallback)", () => {
    const result = parseSSEEvent("app_name", {});
    expect(result).toEqual({ event: "app_name", name: "" });
  });

  it("parses blueprint event", () => {
    const data = { title: "My App", description: "A therapy tool" };
    const result = parseSSEEvent("blueprint", data);
    expect(result).toEqual({ event: "blueprint", data });
  });

  it("parses image_generated event", () => {
    const result = parseSSEEvent("image_generated", {
      label: "happy face",
      imageUrl: "https://example.com/img.png",
    });
    expect(result).toEqual({
      event: "image_generated",
      label: "happy face",
      imageUrl: "https://example.com/img.png",
    });
  });

  it("parses image_generated event with missing fields (nullish fallback)", () => {
    const result = parseSSEEvent("image_generated", {});
    expect(result).toEqual({ event: "image_generated", label: "", imageUrl: "" });
  });

  it("parses speech_generated event", () => {
    const result = parseSSEEvent("speech_generated", {
      text: "Hello world",
      audioUrl: "https://example.com/audio.mp3",
    });
    expect(result).toEqual({
      event: "speech_generated",
      text: "Hello world",
      audioUrl: "https://example.com/audio.mp3",
    });
  });

  it("parses speech_generated event with missing fields (nullish fallback)", () => {
    const result = parseSSEEvent("speech_generated", {});
    expect(result).toEqual({ event: "speech_generated", text: "", audioUrl: "" });
  });

  it("parses stt_enabled event", () => {
    const result = parseSSEEvent("stt_enabled", { purpose: "sentence_strip" });
    expect(result).toEqual({ event: "stt_enabled", purpose: "sentence_strip" });
  });

  it("parses stt_enabled event with missing purpose (nullish fallback)", () => {
    const result = parseSSEEvent("stt_enabled", {});
    expect(result).toEqual({ event: "stt_enabled", purpose: "" });
  });

  it("parses done event with sessionId and files", () => {
    const files = [{ path: "src/App.tsx", contents: "code" }];
    const result = parseSSEEvent("done", { sessionId: "sess_123", files });
    expect(result).toEqual({ event: "done", sessionId: "sess_123", files });
  });

  it("parses done event with no fields (optional fields)", () => {
    const result = parseSSEEvent("done", {});
    expect(result).toEqual({ event: "done", sessionId: undefined, files: undefined });
  });

  it("parses error event", () => {
    const result = parseSSEEvent("error", { message: "Something went wrong" });
    expect(result).toEqual({ event: "error", message: "Something went wrong" });
  });

  it("parses error event with missing message (Unknown error fallback)", () => {
    const result = parseSSEEvent("error", {});
    expect(result).toEqual({ event: "error", message: "Unknown error" });
  });

  it("returns null for unknown event types", () => {
    const result = parseSSEEvent("unknown_event", { foo: "bar" });
    expect(result).toBeNull();
  });

  it("returns null for empty string event", () => {
    const result = parseSSEEvent("", {});
    expect(result).toBeNull();
  });
});
