// src/app/api/__tests__/generate.test.ts
import { describe, expect, it } from "vitest";

import { sseEncode } from "../generate/sse";

describe("sseEncode — Server-Sent Events encoding", () => {
  it("produces correct SSE format: event line, data line, blank line", () => {
    const encoded = sseEncode("status", { status: "generating" });
    expect(encoded).toBe('event: status\ndata: {"status":"generating"}\n\n');
  });

  it("event type appears on the event line", () => {
    const encoded = sseEncode("file_complete", {
      path: "src/App.tsx",
      contents: "// app",
    });
    expect(encoded).toMatch(/^event: file_complete\n/);
  });

  it("data is JSON serialized on the data line", () => {
    const encoded = sseEncode("file_complete", {
      path: "src/App.tsx",
      contents: "// app",
    });
    expect(encoded).toContain('data: {"path":"src/App.tsx","contents":"// app"}');
  });

  it("file_complete event includes path field", () => {
    const encoded = sseEncode("file_complete", {
      path: "src/App.tsx",
      contents: "export default function App() {}",
    });
    const dataLine = encoded.split("\n").find((line) => line.startsWith("data:"))!;
    const data = JSON.parse(dataLine.replace("data: ", ""));
    expect(data.path).toBe("src/App.tsx");
  });

  it("file_complete event includes contents field", () => {
    const encoded = sseEncode("file_complete", {
      path: "src/App.tsx",
      contents: "export default function App() {}",
    });
    const dataLine = encoded.split("\n").find((line) => line.startsWith("data:"))!;
    const data = JSON.parse(dataLine.replace("data: ", ""));
    expect(data.contents).toBe("export default function App() {}");
  });

  it("ends with double newline (SSE message separator)", () => {
    const encoded = sseEncode("done", {});
    expect(encoded.endsWith("\n\n")).toBe(true);
  });

  it("status event with 'live' status encodes correctly", () => {
    // previewUrl is no longer sent in SSE — WebContainer manages the preview URL client-side
    const encoded = sseEncode("status", { status: "live" });
    expect(encoded).toContain('"status":"live"');
  });

  it("error event encodes the error message", () => {
    const encoded = sseEncode("error", { message: "Claude API unavailable" });
    const dataLine = encoded.split("\n").find((line) => line.startsWith("data:"))!;
    const data = JSON.parse(dataLine.replace("data: ", ""));
    expect(data.message).toBe("Claude API unavailable");
  });
});
