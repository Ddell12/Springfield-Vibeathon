"use client";

import { useAction } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import { api } from "../../../../convex/_generated/api";
import { usePatients } from "@/features/patients/hooks/use-patients";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

interface InviteEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type RecipientMode = "existing" | "new";

export function InviteEmailModal({ open, onOpenChange }: InviteEmailModalProps) {
  const patients = usePatients("active");
  const sendInvite = useAction(api.email.sendVideoCallInvite);

  const [mode, setMode] = useState<RecipientMode>("existing");
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [freeEmail, setFreeEmail] = useState("");
  const [freeName, setFreeName] = useState("");
  const [sending, setSending] = useState(false);

  const selectedPatient = patients?.find((p) => p._id === selectedPatientId);

  const toEmail =
    mode === "existing" ? (selectedPatient?.parentEmail ?? "") : freeEmail;
  const toName =
    mode === "existing"
      ? [selectedPatient?.firstName, selectedPatient?.lastName]
          .filter(Boolean)
          .join(" ") || undefined
      : freeName || undefined;

  const canSend =
    mode === "existing"
      ? Boolean(selectedPatient?.parentEmail)
      : Boolean(freeEmail.trim()) && freeEmail.includes("@");

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    try {
      await sendInvite({ toEmail, toName });
      toast.success("Invite sent!");
      onOpenChange(false);
      setSelectedPatientId("");
      setFreeEmail("");
      setFreeName("");
    } catch (err) {
      toast.error("Failed to send invite. Please try again.");
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send session invite</DialogTitle>
          <DialogDescription>
            Email a caregiver a link to book a therapy session with you.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* Recipient mode toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "existing" ? "default" : "outline"}
              onClick={() => setMode("existing")}
              className="flex-1"
            >
              Existing patient
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "new" ? "default" : "outline"}
              onClick={() => setMode("new")}
              className="flex-1"
            >
              New email
            </Button>
          </div>

          {/* Recipient input */}
          {mode === "existing" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="patient-select">Patient</Label>
              <Select
                value={selectedPatientId}
                onValueChange={setSelectedPatientId}
              >
                <SelectTrigger id="patient-select">
                  <SelectValue placeholder="Select a patient…" />
                </SelectTrigger>
                <SelectContent>
                  {(patients ?? []).map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.firstName} {p.lastName}
                      {p.parentEmail ? ` — ${p.parentEmail}` : " (no email)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPatient && !selectedPatient.parentEmail && (
                <p className="text-sm text-destructive">
                  This patient has no caregiver email on file.
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="free-email">Email address</Label>
                <Input
                  id="free-email"
                  type="email"
                  placeholder="caregiver@example.com"
                  value={freeEmail}
                  onChange={(e) => setFreeEmail(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="free-name">Name (optional)</Label>
                <Input
                  id="free-name"
                  type="text"
                  placeholder="First name"
                  value={freeName}
                  onChange={(e) => setFreeName(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Preview */}
          {toEmail && (
            <div className="rounded-lg bg-surface-container p-4 text-sm flex flex-col gap-1">
              <p className="text-on-surface-variant">
                <span className="font-medium text-on-surface">From:</span>{" "}
                Bridges &lt;noreply@bridges.ai&gt;
              </p>
              <p className="text-on-surface-variant">
                <span className="font-medium text-on-surface">To:</span>{" "}
                {toName ? `${toName} <${toEmail}>` : toEmail}
              </p>
              <p className="text-on-surface-variant">
                <span className="font-medium text-on-surface">Subject:</span>{" "}
                You've been invited to a therapy session
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSend}
              disabled={!canSend || sending}
              className="bg-gradient-to-br from-[#00595c] to-[#0d7377] text-white hover:opacity-90"
            >
              {sending ? "Sending…" : "Send invite"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
