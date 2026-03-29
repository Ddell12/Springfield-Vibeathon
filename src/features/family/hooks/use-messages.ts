"use client";

import { useMutation, useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useMessages(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  const messages = useQuery(
    api.patientMessages.list,
    isAuthenticated ? { patientId } : "skip"
  );
  const unreadCount = useQuery(
    api.patientMessages.getUnreadCount,
    isAuthenticated ? { patientId } : "skip"
  );
  const sendMessage = useMutation(api.patientMessages.send);
  const markRead = useMutation(api.patientMessages.markRead);

  return { messages, unreadCount, sendMessage, markRead };
}
