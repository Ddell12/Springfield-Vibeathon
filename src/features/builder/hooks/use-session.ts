// src/features/builder/hooks/use-session.ts
import { useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

// Convex useQuery skip pattern: function ref is always provided, args can be "skip"
export function useSession(sessionId: Id<"sessions"> | null) {
  return useQuery(api.sessions.get, sessionId ? { sessionId } : "skip");
}

export function useSessionMessages(sessionId: Id<"sessions"> | null) {
  return useQuery(api.messages.list, sessionId ? { sessionId } : "skip");
}

export function useSessionFiles(sessionId: Id<"sessions"> | null) {
  return useQuery(api.generated_files.list, sessionId ? { sessionId } : "skip");
}
