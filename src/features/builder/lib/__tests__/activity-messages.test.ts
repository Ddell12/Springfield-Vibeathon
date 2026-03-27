import { describe, expect, it } from "vitest";
import { mapActivityToUserMessage } from "../activity-messages";

describe("mapActivityToUserMessage", () => {
  it("translates thinking activity to warm message", () => {
    expect(mapActivityToUserMessage({ event: "activity", type: "thinking", message: "Understanding your request..." })).toBe("Reading your description...");
  });
  it("suppresses writing_file activities (returns null)", () => {
    expect(mapActivityToUserMessage({ event: "activity", type: "writing_file", message: "Built src/App.tsx (2 files)" })).toBeNull();
  });
  it("suppresses file_written activities (returns null)", () => {
    expect(mapActivityToUserMessage({ event: "activity", type: "file_written", message: "Built src/components/Foo.tsx (3 files)" })).toBeNull();
  });
  it("translates bundling status to warm message", () => {
    expect(mapActivityToUserMessage({ event: "status", status: "bundling" })).toBe("Putting everything together...");
  });
  it("returns null for generating status (timer handles it)", () => {
    expect(mapActivityToUserMessage({ event: "status", status: "generating" })).toBeNull();
  });
  it("translates successful complete activity", () => {
    expect(mapActivityToUserMessage({ event: "activity", type: "complete", message: "App is live and ready!" })).toBe("Your app is ready!");
  });
  it("suppresses build failure complete activity", () => {
    expect(mapActivityToUserMessage({ event: "activity", type: "complete", message: "Build failed: esbuild error xyz" })).toBeNull();
  });
  it("translates image_generated to warm message", () => {
    expect(mapActivityToUserMessage({ event: "image_generated", label: "reward star" })).toBe("Creating pictures for your app...");
  });
  it("translates speech_generated to warm message", () => {
    expect(mapActivityToUserMessage({ event: "speech_generated", text: "Great job!" })).toBe("Recording friendly voices...");
  });
  it("translates stt_enabled to warm message", () => {
    expect(mapActivityToUserMessage({ event: "stt_enabled" })).toBe("Voice input is ready!");
  });
  it("translates 'Almost ready...' thinking to warm variant", () => {
    expect(mapActivityToUserMessage({ event: "activity", type: "thinking", message: "Almost ready..." })).toBe("Almost there...");
  });
  it("returns generic warm message for unknown thinking messages", () => {
    expect(mapActivityToUserMessage({ event: "activity", type: "thinking", message: "Some unknown server message" })).toBe("Working on your app...");
  });
});
