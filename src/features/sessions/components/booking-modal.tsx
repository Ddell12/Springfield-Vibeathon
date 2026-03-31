"use client";

import { useState } from "react";
import { toast } from "sonner";

import { extractErrorMessage } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";

import type { Id } from "../../../../convex/_generated/dataModel";
import { formatDateTime } from "../lib/time-slots";

type PatientOption = {
  _id: Id<"patients">;
  firstName: string;
  lastName: string;
};

export function BookingModal({
  open,
  onOpenChange,
  slotTimestamp,
  patients,
  onBook,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotTimestamp: number | null;
  patients: PatientOption[] | undefined;
  onBook: (args: {
    patientId: Id<"patients">;
    scheduledAt: number;
    notes?: string;
    timezone: string;
  }) => Promise<void>;
}) {
  const [patientId, setPatientId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const tz =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";

  const handleConfirm = async () => {
    if (!slotTimestamp || !patientId) return;
    setSubmitting(true);
    try {
      await onBook({
        patientId: patientId as Id<"patients">,
        scheduledAt: slotTimestamp,
        notes: notes.trim() || undefined,
        timezone: tz,
      });
      setNotes("");
      setPatientId("");
      onOpenChange(false);
    } catch (e) {
      throw e;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Book session</DialogTitle>
          <DialogDescription>
            Choose the patient for this time slot and include any session context.
          </DialogDescription>
        </DialogHeader>
        {slotTimestamp && (
          <p className="text-sm text-on-surface-variant">
            {formatDateTime(slotTimestamp)}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="session-patient">Patient</Label>
          <Select
            value={patientId}
            onValueChange={setPatientId}
            disabled={!patients?.length}
          >
            <SelectTrigger id="session-patient" className="w-full">
              <SelectValue placeholder="Select a patient" />
            </SelectTrigger>
            <SelectContent>
              {patients?.map((p) => (
                <SelectItem key={p._id} value={p._id}>
                  {p.firstName} {p.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="session-notes">Notes (optional)</Label>
          <Textarea
            id="session-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Goals or context for this session…"
            className="resize-none"
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-gradient-to-br from-[#00595c] to-[#0d7377] text-white"
            disabled={!patientId || !slotTimestamp || submitting}
            onClick={() => {
              void handleConfirm().catch((e) => {
                console.error(e);
                toast.error(extractErrorMessage(e, "Could not book session"));
              });
            }}
          >
            {submitting ? "Booking…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
