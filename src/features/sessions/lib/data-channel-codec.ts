import type { InteractiveMessage } from "../types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encode(message: InteractiveMessage): Uint8Array {
  return encoder.encode(JSON.stringify(message));
}

export function decode(payload: Uint8Array): InteractiveMessage {
  return JSON.parse(decoder.decode(payload)) as InteractiveMessage;
}
