"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useSessionNotes(patientId: Id<"patients">, limit?: number) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.sessionNotes.list, isAuthenticated ? { patientId, limit } : "skip");
}

export function useSessionNote(sessionNoteId: Id<"sessionNotes"> | null) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    api.sessionNotes.get,
    isAuthenticated && sessionNoteId ? { noteId: sessionNoteId } : "skip"
  );
}

export function useCreateSessionNote() {
  return useMutation(api.sessionNotes.create);
}

export function useUpdateSessionNote() {
  return useMutation(api.sessionNotes.update);
}

export function useUpdateSoap() {
  return useMutation(api.sessionNotes.updateSoap);
}

export function useUpdateSessionNoteStatus() {
  return useMutation(api.sessionNotes.updateStatus);
}

export function useSignSessionNote() {
  return useMutation(api.sessionNotes.sign);
}

export function useUnsignSessionNote() {
  return useMutation(api.sessionNotes.unsign);
}

export function useDeleteSessionNote() {
  return useMutation(api.sessionNotes.remove);
}
