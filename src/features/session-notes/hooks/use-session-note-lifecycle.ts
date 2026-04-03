"use client";

import { useEffect, useRef, useState } from "react";

import type { Id } from "../../../../convex/_generated/dataModel";
import type { SessionType, StructuredData } from "../components/structured-data-form";
import { useSessionNote } from "./use-session-notes";

export const EMPTY_STRUCTURED_DATA: StructuredData = {
  targetsWorkedOn: [{ target: "" }],
};

export function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function useSessionNoteLifecycle(noteId: Id<"sessionNotes"> | null) {
  const existingNote = useSessionNote(noteId);
  const [sessionDate, setSessionDate] = useState(todayString);
  const [sessionDuration, setSessionDuration] = useState(30);
  const [sessionType, setSessionType] = useState<SessionType>("in-person");
  const [structuredData, setStructuredData] = useState<StructuredData>(EMPTY_STRUCTURED_DATA);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current || !existingNote) return;
    hasInitialized.current = true;
    setSessionDate(existingNote.sessionDate);
    setSessionDuration(existingNote.sessionDuration);
    setSessionType(existingNote.sessionType as SessionType);
    setStructuredData(existingNote.structuredData as StructuredData);
  }, [existingNote]);

  return {
    existingNote,
    sessionDate, setSessionDate,
    sessionDuration, setSessionDuration,
    sessionType, setSessionType,
    structuredData, setStructuredData,
  };
}
