"use client";

import { useMutation, useConvexAuth, useQuery } from "convex/react";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

// The generated API type may not yet include these modules if `npx convex dev`
// hasn't been re-run since they were added. Cast through `any` so TypeScript
// doesn't block compilation while we wait for the next generation cycle.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extendedApi = api as any;

export function useMessages(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  const messages = useQuery(
    extendedApi.patientMessages.list,
    isAuthenticated ? { patientId } : "skip"
  );
  const unreadCount = useQuery(
    extendedApi.patientMessages.getUnreadCount,
    isAuthenticated ? { patientId } : "skip"
  );
  const sendMessage = useMutation(extendedApi.patientMessages.send);
  const markRead = useMutation(extendedApi.patientMessages.markRead);

  return { messages, unreadCount, sendMessage, markRead };
}
