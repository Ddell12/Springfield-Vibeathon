"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { MaterialIcon } from "@/shared/components/material-icon";
import { usePatient } from "@/features/patients/hooks/use-patients";
import {
  useSessionNote,
  useCreateSessionNote,
  useUpdateSessionNote,
  useUpdateSoap,
  useUpdateSessionNoteStatus,
  useSignSessionNote,
  useUnsignSessionNote,
} from "../hooks/use-session-notes";
import { useSoapGeneration } from "../hooks/use-soap-generation";
import {
  StructuredDataForm,
  type StructuredData,
  type SessionType,
} from "./structured-data-form";
import { SoapPreview, type SoapNote } from "./soap-preview";
import type { Id } from "../../../../convex/_generated/dataModel";

interface SessionNoteEditorProps {
  patientId: string;
  noteId?: string; // undefined = create mode
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const EMPTY_STRUCTURED_DATA: StructuredData = {
  targetsWorkedOn: [{ target: "" }],
};

export function SessionNoteEditor({
  patientId,
  noteId,
}: SessionNoteEditorProps) {
  const router = useRouter();
  const typedPatientId = patientId as Id<"patients">;
  const typedNoteId = noteId
    ? (noteId as Id<"sessionNotes">)
    : null;

  // ── Data loading ───────────────────────────────────────────────────────────
  const patient = usePatient(typedPatientId);
  const existingNote = useSessionNote(typedNoteId);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createNote = useCreateSessionNote();
  const updateNote = useUpdateSessionNote();
  const updateSoap = useUpdateSoap();
  const updateStatus = useUpdateSessionNoteStatus();
  const signNote = useSignSessionNote();
  const unsignNote = useUnsignSessionNote();

  // ── SOAP generation ────────────────────────────────────────────────────────
  const soap = useSoapGeneration();

  // ── Local form state ───────────────────────────────────────────────────────
  const [sessionDate, setSessionDate] = useState(todayString);
  const [sessionDuration, setSessionDuration] = useState(30);
  const [sessionType, setSessionType] = useState<SessionType>("in-person");
  const [structuredData, setStructuredData] = useState<StructuredData>(
    EMPTY_STRUCTURED_DATA
  );

  // Track the current note ID (may start null in create mode, then get set after first save)
  const [currentNoteId, setCurrentNoteId] = useState<Id<"sessionNotes"> | null>(
    typedNoteId
  );

  // ── Initialize from existing note ──────────────────────────────────────────
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current || !existingNote) return;
    hasInitialized.current = true;

    setSessionDate(existingNote.sessionDate);
    setSessionDuration(existingNote.sessionDuration);
    setSessionType(existingNote.sessionType as SessionType);
    setStructuredData(existingNote.structuredData as StructuredData);

    // If note already has a SOAP, load it into the soap generation state
    if (existingNote.soapNote) {
      soap.reset();
    }
  }, [existingNote, soap]);

  // ── Auto-save ──────────────────────────────────────────────────────────────
  const autoSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSaving = useRef(false);

  const doSave = useCallback(
    async (
      date: string,
      duration: number,
      type: SessionType,
      data: StructuredData,
      existingId: Id<"sessionNotes"> | null
    ) => {
      if (isSaving.current) return;

      // Don't save if all targets are empty (nothing meaningful to persist)
      const hasContent = data.targetsWorkedOn.some(
        (t) => t.target.trim().length > 0
      );
      if (!hasContent && !existingId) return;

      isSaving.current = true;

      try {
        if (existingId) {
          await updateNote({
            noteId: existingId,
            sessionDate: date,
            sessionDuration: duration,
            sessionType: type,
            structuredData: data,
          });
        } else {
          const newId = await createNote({
            patientId: typedPatientId,
            sessionDate: date,
            sessionDuration: duration,
            sessionType: type,
            structuredData: data,
          });
          setCurrentNoteId(newId);
          // Update URL to include the new note ID without a full navigation
          router.replace(
            `/patients/${patientId}/notes/${newId}`
          );
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save session note"
        );
      } finally {
        isSaving.current = false;
      }
    },
    [createNote, updateNote, typedPatientId, patientId, router]
  );

  const scheduleAutoSave = useCallback(
    (
      date: string,
      duration: number,
      type: SessionType,
      data: StructuredData
    ) => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
      autoSaveTimeout.current = setTimeout(() => {
        doSave(date, duration, type, data, currentNoteId);
      }, 1000);
    },
    [doSave, currentNoteId]
  );

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
    };
  }, []);

  // ── Change handlers (trigger auto-save) ────────────────────────────────────
  const isSigned = existingNote?.status === "signed";

  function handleSessionDateChange(date: string) {
    setSessionDate(date);
    scheduleAutoSave(date, sessionDuration, sessionType, structuredData);
  }

  function handleSessionDurationChange(duration: number) {
    setSessionDuration(duration);
    scheduleAutoSave(sessionDate, duration, sessionType, structuredData);
  }

  function handleSessionTypeChange(type: SessionType) {
    setSessionType(type);
    scheduleAutoSave(sessionDate, sessionDuration, type, structuredData);
  }

  function handleStructuredDataChange(data: StructuredData) {
    setStructuredData(data);
    scheduleAutoSave(sessionDate, sessionDuration, sessionType, data);
  }

  // ── SOAP generation ────────────────────────────────────────────────────────
  async function handleGenerateSoap() {
    if (!currentNoteId) {
      toast.error("Please add at least one target before generating a SOAP note");
      return;
    }
    try {
      await soap.generate(currentNoteId);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate SOAP note"
      );
    }
  }

  // ── SOAP editing ───────────────────────────────────────────────────────────
  async function handleSoapEdit(updatedSoap: SoapNote) {
    if (!currentNoteId) return;
    try {
      await updateSoap({
        noteId: currentNoteId,
        soapNote: updatedSoap,
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update SOAP note"
      );
    }
  }

  // ── Status management ──────────────────────────────────────────────────────
  async function handleMarkComplete() {
    if (!currentNoteId) return;
    try {
      await updateStatus({ noteId: currentNoteId, status: "complete" });
      toast.success("Note marked as complete");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to mark note complete"
      );
    }
  }

  async function handleSign() {
    if (!currentNoteId) return;
    try {
      await signNote({ noteId: currentNoteId });
      toast.success("Note signed successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to sign note"
      );
    }
  }

  async function handleUnsign() {
    if (!currentNoteId) return;
    try {
      await unsignNote({ noteId: currentNoteId });
      toast.success("Note unsigned");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to unsign note"
      );
    }
  }

  // ── Loading / not found ────────────────────────────────────────────────────
  // patient is undefined while loading, null if not found
  if (patient === undefined || (typedNoteId && existingNote === undefined)) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-muted-foreground">
          <MaterialIcon icon="progress_activity" className="animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (patient === null) {
    notFound();
  }

  if (typedNoteId && existingNote === null) {
    notFound();
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const noteStatus = existingNote?.status ?? "draft";
  const isComplete = noteStatus === "complete";
  const hasSoap =
    soap.soapNote !== null || existingNote?.soapNote !== undefined;
  const hasTargets = structuredData.targetsWorkedOn.some(
    (t) => t.target.trim().length > 0
  );

  // Resolve displayed SOAP: prefer live generation state, fall back to persisted
  const displayedSoap = soap.soapNote ?? (existingNote?.soapNote as SoapNote | undefined) ?? null;
  const soapStatus =
    soap.status !== "idle"
      ? soap.status
      : existingNote?.soapNote
        ? "complete"
        : "idle";

  const canSign =
    isComplete &&
    (displayedSoap !== null) &&
    !isSigned;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3">
        <Link
          href={`/patients/${patientId}`}
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:text-foreground"
        >
          <MaterialIcon icon="arrow_back" size="sm" />
          Back to patient
        </Link>

        <div className="flex items-center justify-between">
          <h1 className="font-[family-name:var(--font-manrope)] text-2xl font-bold text-foreground">
            {noteId ? "Edit Session Note" : "New Session Note"}
          </h1>

          {isSigned && (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <MaterialIcon icon="verified" size="xs" />
              Signed
            </div>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column: Structured data form + generate button */}
        <div className="flex flex-col gap-4">
          <StructuredDataForm
            patient={patient}
            sessionDate={sessionDate}
            sessionDuration={sessionDuration}
            sessionType={sessionType}
            structuredData={structuredData}
            disabled={isSigned}
            onSessionDateChange={handleSessionDateChange}
            onSessionDurationChange={handleSessionDurationChange}
            onSessionTypeChange={handleSessionTypeChange}
            onStructuredDataChange={handleStructuredDataChange}
          />

          <Button
            onClick={handleGenerateSoap}
            disabled={
              !hasTargets ||
              isSigned ||
              soap.status === "generating" ||
              !currentNoteId
            }
            className="w-full bg-gradient-to-br from-[#00595c] to-[#0d7377] text-white transition-opacity duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:opacity-90"
          >
            <MaterialIcon icon="auto_awesome" size="sm" />
            {soap.status === "generating"
              ? "Generating..."
              : "Generate SOAP Note"}
          </Button>
        </div>

        {/* Right column: SOAP preview + status footer */}
        <div className="flex flex-col gap-4">
          <SoapPreview
            soapNote={displayedSoap}
            streamedText={soap.streamedText}
            status={soapStatus}
            error={soap.error}
            aiGenerated={existingNote?.aiGenerated ?? false}
            disabled={isSigned}
            onEdit={handleSoapEdit}
            onRegenerate={handleGenerateSoap}
          />

          {/* Status footer */}
          {currentNoteId && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MaterialIcon icon="info" size="xs" />
                <span>
                  Status:{" "}
                  <span className="font-medium text-foreground">
                    {noteStatus === "draft"
                      ? "Draft"
                      : noteStatus === "in-progress"
                        ? "In Progress"
                        : noteStatus === "complete"
                          ? "Complete"
                          : "Signed"}
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isSigned ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUnsign}
                  >
                    <MaterialIcon icon="lock_open" size="xs" />
                    Unsign
                  </Button>
                ) : (
                  <>
                    {noteStatus !== "complete" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMarkComplete}
                        disabled={!hasTargets}
                      >
                        <MaterialIcon icon="check_circle" size="xs" />
                        Mark Complete
                      </Button>
                    )}

                    <Button
                      size="sm"
                      onClick={handleSign}
                      disabled={!canSign}
                      className="bg-gradient-to-br from-[#00595c] to-[#0d7377] text-white transition-opacity duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:opacity-90"
                    >
                      <MaterialIcon icon="verified" size="xs" />
                      Sign Note
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
