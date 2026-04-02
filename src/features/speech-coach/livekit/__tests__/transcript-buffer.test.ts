import { describe, expect, it } from "vitest";

import {
  bufferConversationItem,
  buildTranscriptPersistencePayload,
  captureUserInputTranscription,
  createTranscriptBufferState,
} from "../transcript-buffer";

describe("transcript-buffer", () => {
  it("converts conversation_item_added events into normalized persisted turns", () => {
    const state = createTranscriptBufferState();

    bufferConversationItem(state, {
      id: "assistant-1",
      role: "assistant",
      textContent: " Say sad ",
      createdAt: 2000,
    });
    bufferConversationItem(state, {
      id: "user-1",
      role: "user",
      textContent: "sad",
      createdAt: 3000,
    });

    const payload = buildTranscriptPersistencePayload(state);
    expect(payload?.rawTranscriptTurns).toEqual([
      { speaker: "coach", text: "Say sad", timestampMs: 2000 },
      { speaker: "child", text: "sad", timestampMs: 3000 },
    ]);
  });

  it("ignores duplicate, interrupted, and empty items", () => {
    const state = createTranscriptBufferState();

    expect(
      bufferConversationItem(state, {
        id: "assistant-1",
        role: "assistant",
        textContent: "Try again",
        createdAt: 1000,
      }),
    ).toBe(true);
    expect(
      bufferConversationItem(state, {
        id: "assistant-1",
        role: "assistant",
        textContent: "Try again",
        createdAt: 1000,
      }),
    ).toBe(false);
    expect(
      bufferConversationItem(state, {
        id: "assistant-2",
        role: "assistant",
        textContent: "   ",
        createdAt: 1200,
      }),
    ).toBe(false);
    expect(
      bufferConversationItem(state, {
        id: "assistant-3",
        role: "assistant",
        textContent: "Partial reply",
        createdAt: 1300,
        interrupted: true,
      }),
    ).toBe(false);

    const payload = buildTranscriptPersistencePayload(state);
    expect(payload?.rawTranscriptTurns).toEqual([
      { speaker: "coach", text: "Try again", timestampMs: 1000 },
    ]);
  });

  it("builds a shutdown payload in chronological order with speaker labels and gap filling", () => {
    const state = createTranscriptBufferState();

    bufferConversationItem(state, {
      id: "assistant-2",
      role: "assistant",
      textContent: "Nice work",
      createdAt: 4000,
    });
    bufferConversationItem(state, {
      id: "assistant-1",
      role: "assistant",
      textContent: "Say sun",
      createdAt: 1000,
    });
    captureUserInputTranscription(state, {
      transcript: "sun",
      isFinal: true,
      createdAt: 2200,
    });

    const payload = buildTranscriptPersistencePayload(state);
    expect(payload).toEqual({
      rawTranscript: "Coach: Say sun\nChild: sun\nCoach: Nice work",
      rawTranscriptTurns: [
        { speaker: "coach", text: "Say sun", timestampMs: 1000 },
        { speaker: "child", text: "sun", timestampMs: 2200 },
        { speaker: "coach", text: "Nice work", timestampMs: 4000 },
      ],
    });
  });
});
