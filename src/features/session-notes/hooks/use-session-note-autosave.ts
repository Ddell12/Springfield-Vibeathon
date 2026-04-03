"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { Id } from "../../../../convex/_generated/dataModel";
import type { SessionType, StructuredData } from "../components/structured-data-form";
import {
  useCreateGroupSessionNote,
  useCreateSessionNote,
  useUpdateSessionNote,
} from "./use-session-notes";

interface UseSessionNoteAutosaveProps {
  patientId: Id<"patients">;
  initialNoteId: Id<"sessionNotes"> | null;
  isGroupMode: boolean;
  groupPatientIds: Id<"patients">[];
}

export function useSessionNoteAutosave({
  patientId,
  initialNoteId,
  isGroupMode,
  groupPatientIds,
}: UseSessionNoteAutosaveProps) {
  const router = useRouter();
  const [currentNoteId, setCurrentNoteId] = useState<Id<"sessionNotes"> | null>(initialNoteId);
  const currentNoteIdRef = useRef(currentNoteId);
  useEffect(() => { currentNoteIdRef.current = currentNoteId; }, [currentNoteId]);

  const autoSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSaving = useRef(false);
  const createNote = useCreateSessionNote();
  const updateNote = useUpdateSessionNote();
  const createGroupNote = useCreateGroupSessionNote();

  useEffect(() => {
    return () => {
      if (autoSaveTimeout.current) clearTimeout(autoSaveTimeout.current);
    };
  }, []);

  const doSave = useCallback(
    async (
      date: string,
      duration: number,
      type: SessionType,
      data: StructuredData,
      existingId: Id<"sessionNotes"> | null
    ) => {
      if (isSaving.current) return;
      const hasContent = data.targetsWorkedOn.some((t) => t.target.trim().length > 0);
      if (!hasContent && !existingId) return;
      isSaving.current = true;
      try {
        if (existingId) {
          await updateNote({ noteId: existingId, sessionDate: date, sessionDuration: duration, sessionType: type, structuredData: data });
        } else if (isGroupMode && groupPatientIds.length >= 2) {
          const allPatientIds = [patientId, ...groupPatientIds.filter((id) => id !== patientId)];
          const noteIds = await createGroupNote({ patientIds: allPatientIds, sessionDate: date, sessionDuration: duration, sessionType: type, structuredData: data });
          const firstNoteId = noteIds[0];
          setCurrentNoteId(firstNoteId);
          router.replace(`/patients/${patientId}/sessions/${firstNoteId}`);
          toast.success(`Created group session notes for ${allPatientIds.length} patients`);
        } else {
          const newId = await createNote({ patientId, sessionDate: date, sessionDuration: duration, sessionType: type, structuredData: data });
          setCurrentNoteId(newId);
          router.replace(`/patients/${patientId}/sessions/${newId}`);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save session note");
      } finally {
        isSaving.current = false;
      }
    },
    [createNote, createGroupNote, updateNote, patientId, router, isGroupMode, groupPatientIds]
  );

  const scheduleAutoSave = useCallback(
    (date: string, duration: number, type: SessionType, data: StructuredData) => {
      if (autoSaveTimeout.current) clearTimeout(autoSaveTimeout.current);
      autoSaveTimeout.current = setTimeout(() => {
        doSave(date, duration, type, data, currentNoteIdRef.current);
      }, 1000);
    },
    [doSave]
  );

  return { currentNoteId, scheduleAutoSave };
}
