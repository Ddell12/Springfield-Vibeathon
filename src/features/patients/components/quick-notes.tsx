"use client";

import { useMutation } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { toast } from "sonner";
import type { Doc } from "../../../../convex/_generated/dataModel";

interface QuickNotesProps {
  patient: Doc<"patients">;
}

export function QuickNotes({ patient }: QuickNotesProps) {
  const updatePatient = useMutation(api.patients.update);
  const [notes, setNotes] = useState(patient.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);

  // Sync when patient data changes externally
  useEffect(() => {
    setNotes(patient.notes ?? "");
  }, [patient.notes]);

  const saveNotes = useCallback(async () => {
    if (notes === (patient.notes ?? "")) return;
    setIsSaving(true);
    try {
      await updatePatient({ patientId: patient._id, notes });
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setIsSaving(false);
    }
  }, [notes, patient._id, patient.notes, updatePatient]);

  return (
    <div className="rounded-xl bg-surface-container p-6">
      <div className="mb-2 flex items-center justify-between">
        <Label htmlFor="quickNotes" className="text-sm font-semibold text-foreground">
          Notes
        </Label>
        {isSaving && (
          <span className="text-xs text-on-surface-variant">Saving...</span>
        )}
      </div>
      <Textarea
        id="quickNotes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={saveNotes}
        placeholder="Add clinical notes, observations, or reminders..."
        rows={4}
        className="resize-y"
      />
    </div>
  );
}
