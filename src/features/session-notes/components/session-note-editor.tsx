"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { useState } from "react";

import { cn } from "@/core/utils";
import { usePatient } from "@/shared/clinical";
import { MaterialIcon } from "@/shared/components/material-icon";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/shared/components/ui/radio-group";

import type { Id } from "../../../../convex/_generated/dataModel";
import { useSessionNoteAutosave } from "../hooks/use-session-note-autosave";
import { useSessionNoteLifecycle } from "../hooks/use-session-note-lifecycle";
import { useSessionNoteSigning } from "../hooks/use-session-note-signing";
import {
  getSignatureDelayDays,
  isLateSignature,
} from "../lib/session-utils";
import { DurationPresetInput } from "./duration-preset-input";
import { GroupPatientPicker } from "./group-patient-picker";
import { type SoapNote, SoapPreview } from "./soap-preview";
import {
  SESSION_TYPE_OPTIONS,
  type SessionType,
  StructuredDataForm,
} from "./structured-data-form";

interface SessionNoteEditorProps {
  patientId: string;
  noteId?: string; // undefined = create mode
}

export function SessionNoteEditor({
  patientId,
  noteId,
}: SessionNoteEditorProps) {
  const typedPatientId = patientId as Id<"patients">;
  const typedNoteId = noteId ? (noteId as Id<"sessionNotes">) : null;

  // ── Data loading ───────────────────────────────────────────────────────────
  const patient = usePatient(typedPatientId);

  // ── Group session state ────────────────────────────────────────────────────
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [groupPatientIds, setGroupPatientIds] = useState<Id<"patients">[]>([]);

  // ── Lifecycle hook: form state + existing note data ────────────────────────
  const {
    existingNote,
    sessionDate, setSessionDate,
    sessionDuration, setSessionDuration,
    sessionType, setSessionType,
    structuredData, setStructuredData,
  } = useSessionNoteLifecycle(typedNoteId);

  // ── Autosave hook ──────────────────────────────────────────────────────────
  const { currentNoteId, scheduleAutoSave } = useSessionNoteAutosave({
    patientId: typedPatientId,
    initialNoteId: typedNoteId,
    isGroupMode,
    groupPatientIds,
  });

  // ── Signing hook ───────────────────────────────────────────────────────────
  const {
    soap,
    handleGenerateSoap,
    handleSoapEdit,
    handleMarkComplete,
    handleSign,
    handleUnsign,
  } = useSessionNoteSigning(currentNoteId);

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

  function handleStructuredDataChange(data: typeof structuredData) {
    setStructuredData(data);
    scheduleAutoSave(sessionDate, sessionDuration, sessionType, data);
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

  // ── Patient initials for avatar ────────────────────────────────────────────
  const patientInitials = `${patient.firstName[0] ?? ""}${patient.lastName[0] ?? ""}`.toUpperCase();
  const patientFullName = `${patient.firstName} ${patient.lastName}`;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-3">
        <Link
          href={`/patients/${patientId}`}
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:text-foreground"
        >
          <MaterialIcon icon="arrow_back" size="sm" />
          Back to patient
        </Link>

        <div className="flex items-center justify-between">
          <h1 className="font-headline text-2xl font-bold text-on-surface">
            {noteId ? "Edit Session Note" : "New Session Note"}
          </h1>

          {isSigned && (
            <div className="flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-sm font-medium text-success">
              <MaterialIcon icon="verified" size="xs" />
              Signed
            </div>
          )}
        </div>

        {/* Late-signature warning banner */}
        {isSigned &&
          existingNote &&
          isLateSignature(existingNote.signedAt, existingNote.sessionDate) && (
            <div className="flex items-center gap-2 rounded-lg bg-caution-container/50 px-4 py-2.5 text-sm text-on-caution-container">
              <MaterialIcon icon="warning" size="sm" />
              <span>
                This note was signed{" "}
                <span className="font-semibold">
                  {getSignatureDelayDays(existingNote.signedAt, existingNote.sessionDate)} days
                </span>{" "}
                after the session date. Medicare and most payers expect same-day signatures.
              </span>
            </div>
          )}
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left column */}
        <div className="flex flex-1 flex-col gap-4 lg:max-w-[66%]">

          {/* Card 1: Session header */}
          <div className="rounded-2xl bg-surface-container p-4">
            {/* Group/Individual mode toggle — only in create mode */}
            {!noteId && (
              <div className="mb-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => { setIsGroupMode(false); setGroupPatientIds([]); }}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-300",
                      !isGroupMode
                        ? "bg-primary text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                  >
                    <MaterialIcon icon="person" size="xs" />
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsGroupMode(true)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-300",
                      isGroupMode
                        ? "bg-primary text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                  >
                    <MaterialIcon icon="group" size="xs" />
                    Group (CPT 92508)
                  </button>
                </div>

                {isGroupMode && (
                  <GroupPatientPicker
                    selectedIds={groupPatientIds}
                    excludePatientId={typedPatientId}
                    onSelectionChange={setGroupPatientIds}
                    disabled={isSigned}
                  />
                )}
              </div>
            )}

            {/* Date, duration, and session type — inlined here in Card 1 */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-foreground">
                Session Details
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Date picker */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="session-date">Date</Label>
                  <Input
                    id="session-date"
                    type="date"
                    value={sessionDate}
                    onChange={(e) => handleSessionDateChange(e.target.value)}
                    disabled={isSigned}
                  />
                </div>

                {/* Duration */}
                <div className="flex flex-col gap-1.5">
                  <Label>Duration (minutes)</Label>
                  <DurationPresetInput
                    value={sessionDuration}
                    onChange={handleSessionDurationChange}
                    disabled={isSigned}
                  />
                </div>
              </div>

              {/* Session type */}
              <div className="flex flex-col gap-1.5">
                <Label>Session Type</Label>
                <RadioGroup
                  value={sessionType}
                  onValueChange={(value) =>
                    handleSessionTypeChange(value as SessionType)
                  }
                  disabled={isSigned}
                  className="flex flex-wrap gap-3"
                >
                  {SESSION_TYPE_OPTIONS.map((opt) => (
                    <Label
                      key={opt.value}
                      htmlFor={`session-type-${opt.value}`}
                      className="flex cursor-pointer items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm transition-colors duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] has-[:checked]:bg-foreground/10 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
                    >
                      <RadioGroupItem
                        value={opt.value}
                        id={`session-type-${opt.value}`}
                      />
                      <MaterialIcon icon={opt.icon} size="sm" />
                      {opt.label}
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            </div>
          </div>

          {/* Card 2: Targets + Additional Notes (complete StructuredDataForm) */}
          <div className="rounded-2xl bg-surface-container p-4">
            <StructuredDataForm
              patient={patient}
              sessionDate={sessionDate}
              sessionDuration={sessionDuration}
              sessionType={sessionType}
              structuredData={structuredData}
              disabled={isSigned}
              showHeader={false}
              onSessionDateChange={handleSessionDateChange}
              onSessionDurationChange={handleSessionDurationChange}
              onSessionTypeChange={handleSessionTypeChange}
              onStructuredDataChange={handleStructuredDataChange}
            />
          </div>

          {/* Card 3: SOAP Note */}
          <div className="rounded-2xl bg-surface-container p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-on-surface">
                SOAP Note
              </h2>
              <Button
                onClick={handleGenerateSoap}
                disabled={
                  !hasTargets ||
                  isSigned ||
                  soap.status === "generating" ||
                  !currentNoteId
                }
                size="sm"
                className="bg-primary-gradient text-white transition-opacity duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:opacity-90"
              >
                <MaterialIcon icon="auto_awesome" size="xs" />
                {soap.status === "generating" ? "Generating..." : "Generate with AI"}
              </Button>
            </div>

            {/* SOAP section accordion — shows section labels as expandable stubs */}
            {!hasSoap && soapStatus === "idle" && (
              <Accordion type="multiple" className="mb-4">
                {(["Subjective", "Objective", "Assessment", "Plan"] as const).map((label) => (
                  <AccordionItem key={label} value={label}>
                    <AccordionTrigger className="text-sm text-muted-foreground">
                      {label}
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm italic text-muted-foreground">
                        Generate a SOAP note to populate this section.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}

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
          </div>
        </div>

        {/* Right column — hidden on mobile */}
        <div className="hidden lg:flex lg:w-80 shrink-0 flex-col gap-4">
          {/* Patient card */}
          <div className="rounded-2xl bg-surface-container p-4">
            <div className="flex items-center gap-3">
              {/* Initials avatar */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-gradient text-sm font-semibold text-white">
                {patientInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-on-surface">
                  {patientFullName}
                </p>
                <Link
                  href={`/patients/${patientId}`}
                  className="text-xs text-primary transition-colors duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:underline"
                >
                  View profile →
                </Link>
              </div>
            </div>
          </div>

          {/* Status card */}
          {currentNoteId && (
            <div className="rounded-2xl bg-surface-container p-4">
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
            </div>
          )}
        </div>
      </div>

      {/* Sticky signature strip */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border/50 bg-background/95 px-4 py-3 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {!isSigned && canSign && (
              <>
                <MaterialIcon icon="draw" size="xs" />
                <span>Ready to sign</span>
              </>
            )}
            {!isSigned && !canSign && (
              <>
                <MaterialIcon icon="edit_note" size="xs" />
                <span>
                  {!hasTargets
                    ? "Add at least one target to continue"
                    : !isComplete
                      ? "Mark complete before signing"
                      : !hasSoap
                        ? "Generate a SOAP note before signing"
                        : "Complete all fields to sign"}
                </span>
              </>
            )}
            {isSigned && (
              <>
                <MaterialIcon icon="verified" size="xs" className="text-success" />
                <span className="text-success">Note signed</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentNoteId && !isSigned && noteStatus !== "complete" && (
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
              <Button
                size="sm"
                onClick={handleSign}
                disabled={!canSign}
                className="bg-primary-gradient text-white transition-opacity duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:opacity-90"
              >
                <MaterialIcon icon="verified" size="xs" />
                Sign &amp; Save
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
