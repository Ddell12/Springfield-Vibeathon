type TranscriptSpeaker = "coach" | "child" | "system";
type ChatRole = "assistant" | "developer" | "system" | "user";

export type PersistedTranscriptTurn = {
  speaker: TranscriptSpeaker;
  text: string;
  timestampMs: number;
};

export type ConversationMessageLike = {
  id: string;
  role: ChatRole;
  textContent?: string;
  createdAt: number;
  interrupted?: boolean;
};

export type UserInputTranscribedLike = {
  transcript: string;
  isFinal: boolean;
  createdAt: number;
};

type BufferedTranscriptTurn = PersistedTranscriptTurn & {
  sourceId: string;
};

export type TranscriptBufferState = {
  turnsBySourceId: Map<string, BufferedTranscriptTurn>;
  latestFinalUserInput: PersistedTranscriptTurn | null;
};

export function createTranscriptBufferState(): TranscriptBufferState {
  return {
    turnsBySourceId: new Map<string, BufferedTranscriptTurn>(),
    latestFinalUserInput: null,
  };
}

export function bufferConversationItem(
  state: TranscriptBufferState,
  item: ConversationMessageLike,
): boolean {
  const normalizedTurn = normalizeConversationItem(item);
  if (!normalizedTurn) return false;
  if (state.turnsBySourceId.has(normalizedTurn.sourceId)) return false;

  state.turnsBySourceId.set(normalizedTurn.sourceId, normalizedTurn);
  return true;
}

export function captureUserInputTranscription(
  state: TranscriptBufferState,
  event: UserInputTranscribedLike,
): boolean {
  if (!event.isFinal) return false;

  const normalizedText = normalizeTranscriptText(event.transcript);
  if (!normalizedText) return false;

  state.latestFinalUserInput = {
    speaker: "child",
    text: normalizedText,
    timestampMs: event.createdAt,
  };
  return true;
}

export function buildTranscriptPersistencePayload(state: TranscriptBufferState): {
  rawTranscript: string;
  rawTranscriptTurns: PersistedTranscriptTurn[];
} | null {
  const rawTranscriptTurns = Array.from(state.turnsBySourceId.values())
    .sort((left, right) => left.timestampMs - right.timestampMs)
    .map(({ sourceId: _sourceId, ...turn }) => turn);

  maybeAppendGapFilledUserTurn(rawTranscriptTurns, state.latestFinalUserInput);

  if (rawTranscriptTurns.length === 0) return null;

  return {
    rawTranscript: serializeTranscriptTurns(rawTranscriptTurns),
    rawTranscriptTurns,
  };
}

export function serializeTranscriptTurns(turns: PersistedTranscriptTurn[]): string {
  return turns
    .map((turn) => `${formatSpeakerLabel(turn.speaker)}: ${turn.text}`)
    .join("\n");
}

function normalizeConversationItem(
  item: ConversationMessageLike,
): BufferedTranscriptTurn | null {
  if (item.interrupted) return null;

  const speaker = mapChatRoleToSpeaker(item.role);
  if (!speaker) return null;

  const text = normalizeTranscriptText(item.textContent);
  if (!text) return null;

  return {
    sourceId: item.id,
    speaker,
    text,
    timestampMs: item.createdAt,
  };
}

function normalizeTranscriptText(text?: string): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function mapChatRoleToSpeaker(role: ChatRole): TranscriptSpeaker | null {
  if (role === "assistant") return "coach";
  if (role === "user") return "child";
  if (role === "system" || role === "developer") return "system";
  return null;
}

function maybeAppendGapFilledUserTurn(
  turns: PersistedTranscriptTurn[],
  latestFinalUserInput: PersistedTranscriptTurn | null,
) {
  if (!latestFinalUserInput) return;

  const duplicateChildTurn = turns.some((turn) =>
    turn.speaker === "child" &&
    turn.text === latestFinalUserInput.text &&
    Math.abs(turn.timestampMs - latestFinalUserInput.timestampMs) < 2000,
  );
  if (duplicateChildTurn) return;

  turns.push(latestFinalUserInput);
  turns.sort((left, right) => left.timestampMs - right.timestampMs);
}

function formatSpeakerLabel(speaker: TranscriptSpeaker): string {
  if (speaker === "coach") return "Coach";
  if (speaker === "child") return "Child";
  return "System";
}
