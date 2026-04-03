"use client";

import { useCallback } from "react";
import { toast } from "sonner";

import type { Id } from "../../../../convex/_generated/dataModel";
import type { SoapNote } from "../components/soap-preview";
import {
  useSignSessionNote,
  useUnsignSessionNote,
  useUpdateSessionNoteStatus,
  useUpdateSoap,
} from "./use-session-notes";
import { useSoapGeneration } from "./use-soap-generation";

export function useSessionNoteSigning(currentNoteId: Id<"sessionNotes"> | null) {
  const updateStatus = useUpdateSessionNoteStatus();
  const signNote = useSignSessionNote();
  const unsignNote = useUnsignSessionNote();
  const updateSoap = useUpdateSoap();
  const soap = useSoapGeneration();

  const handleGenerateSoap = useCallback(async () => {
    if (!currentNoteId) {
      toast.error("Please add at least one target before generating a SOAP note");
      return;
    }
    try {
      await soap.generate(currentNoteId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate SOAP note");
    }
  }, [currentNoteId, soap]);

  const handleSoapEdit = useCallback(async (updatedSoap: SoapNote) => {
    if (!currentNoteId) return;
    try {
      await updateSoap({ noteId: currentNoteId, soapNote: updatedSoap });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update SOAP note");
    }
  }, [currentNoteId, updateSoap]);

  const handleMarkComplete = useCallback(async () => {
    if (!currentNoteId) return;
    try {
      await updateStatus({ noteId: currentNoteId, status: "complete" });
      toast.success("Note marked as complete");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark note complete");
    }
  }, [currentNoteId, updateStatus]);

  const handleSign = useCallback(async () => {
    if (!currentNoteId) return;
    try {
      await signNote({ noteId: currentNoteId });
      toast.success("Session note signed. Billing record is ready for review.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sign note");
    }
  }, [currentNoteId, signNote]);

  const handleUnsign = useCallback(async () => {
    if (!currentNoteId) return;
    try {
      await unsignNote({ noteId: currentNoteId });
      toast.success("Note unsigned");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to unsign note");
    }
  }, [currentNoteId, unsignNote]);

  return { soap, handleGenerateSoap, handleSoapEdit, handleMarkComplete, handleSign, handleUnsign };
}
