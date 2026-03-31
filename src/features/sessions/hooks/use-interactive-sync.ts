"use client";

import type { ReceivedDataMessage } from "@livekit/components-core";
import { useDataChannel } from "@livekit/components-react";
import { useCallback, useRef, useState } from "react";

import { decode, encode } from "../lib/data-channel-codec";
import { LIVEKIT_DATA_TOPICS } from "../lib/livekit-config";
import type {
  ContentControl,
  ContentUpdate,
  Interaction,
  InteractiveMessage,
} from "../types";

export function useInteractiveSync() {
  const [currentContent, setCurrentContent] = useState<ContentUpdate | null>(null);
  const [lastInteraction, setLastInteraction] = useState<Interaction | null>(null);
  const interactionLogRef = useRef<Interaction[]>([]);

  const handleContentMessage = useCallback((msg: ReceivedDataMessage) => {
    const decoded = decode(msg.payload) as InteractiveMessage;
    if (decoded.type === "content-update") {
      setCurrentContent(decoded);
    } else if (decoded.type === "content-clear") {
      setCurrentContent(null);
    }
  }, []);

  const handleInteractionMessage = useCallback((msg: ReceivedDataMessage) => {
    const decoded = decode(msg.payload) as InteractiveMessage;
    if (decoded.type === "interaction") {
      const interaction = decoded;
      setLastInteraction(interaction);
      interactionLogRef.current.push(interaction);
    }
  }, []);

  const { send: sendContentRaw } = useDataChannel(
    LIVEKIT_DATA_TOPICS.CONTENT,
    handleContentMessage,
  );

  const { send: sendInteractionRaw } = useDataChannel(
    LIVEKIT_DATA_TOPICS.INTERACTION,
    handleInteractionMessage,
  );

  const sendContent = useCallback(
    (message: ContentUpdate | ContentControl) => {
      void sendContentRaw(encode(message), { reliable: true });
      // LiveKit does not echo data messages back to the sender, so we mirror
      // local state immediately to keep the SLP's view in sync with what was sent.
      if (message.type === "content-update") {
        setCurrentContent(message);
      } else if (message.type === "content-clear") {
        setCurrentContent(null);
      }
    },
    [sendContentRaw],
  );

  const sendInteraction = useCallback(
    (interaction: Interaction) => {
      void sendInteractionRaw(encode(interaction), { reliable: true });
    },
    [sendInteractionRaw],
  );

  const getInteractionLog = useCallback(() => {
    return JSON.stringify(interactionLogRef.current);
  }, []);

  return {
    currentContent,
    lastInteraction,
    sendContent,
    sendInteraction,
    getInteractionLog,
  } as const;
}
