"use client";

import { useMutation, useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useSessionNotes(patientId: Id<"patients">, limit?: number) {
  return useQuery(api.sessionNotes.list, { patientId, limit });
}

export function useSessionNote(sessionNoteId: Id<"sessionNotes"> | null) {
  return useQuery(
    api.sessionNotes.get,
    sessionNoteId ? { noteId: sessionNoteId } : "skip"
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
