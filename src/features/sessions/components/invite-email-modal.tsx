"use client";

import { useAction } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { extractErrorMessage } from "@/core/utils";
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

import { api } from "../../../../convex/_generated/api";

interface InviteEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type RecipientMode = "existing" | "new";
type InviteStatus =
  | "waiting"
  | "queued"
  | "sent"
  | "delivered"
  | "delivery_delayed"
  | "bounced"
  | "failed"
  | "cancelled";

const FINAL_INVITE_STATUSES = new Set<InviteStatus>([
  "delivered",
  "bounced",
  "failed",
  "cancelled",
]);
const PLACEHOLDER_EMAIL_DOMAINS = new Set(["example.com", "example.org", "example.net", "test.com"]);

function formatStatusLabel(status: InviteStatus): string {
  switch (status) {
    case "delivery_delayed":
      return "Delivery delayed";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

function isPlaceholderEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const domain = normalized.split("@")[1] ?? "";
  return PLACEHOLDER_EMAIL_DOMAINS.has(domain) || domain.endsWith(".test");
}

export function InviteEmailModal({ open, onOpenChange }: InviteEmailModalProps) {
  const patients = usePatients("active");
  const sendInvite = useAction(api.email.sendVideoCallInvite);
  const getInviteStatus = useAction(api.email.getInviteEmailStatus);

  const [mode, setMode] = useState<RecipientMode>("existing");
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [freeEmail, setFreeEmail] = useState("");
  const [freeName, setFreeName] = useState("");
  const [sending, setSending] = useState(false);
  const [lastEmailId, setLastEmailId] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<{
    status: InviteStatus;
    errorMessage: string | null;
  } | null>(null);

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
  const hasPlaceholderRecipient = Boolean(toEmail) && isPlaceholderEmail(toEmail);

  useEffect(() => {
    if (!open || !lastEmailId || (lastStatus && FINAL_INVITE_STATUSES.has(lastStatus.status))) {
      return;
    }

    let cancelled = false;
    const interval = window.setInterval(async () => {
      try {
        const status = await getInviteStatus({ emailId: lastEmailId });
        if (!status || cancelled) return;

        setLastStatus({
          status: status.status as InviteStatus,
          errorMessage: status.errorMessage,
        });
      } catch (err) {
        if (!cancelled) {
          console.error("[invite-email] failed to fetch status", err);
        }
      }
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [getInviteStatus, lastEmailId, lastStatus, open]);

  async function handleSend() {
    if (!canSend || hasPlaceholderRecipient) return;
    setSending(true);
    try {
      const emailId = await sendInvite({ toEmail, toName });
      setLastEmailId(emailId);
      setLastStatus({ status: "queued", errorMessage: null });
      toast.success("Invite queued. Tracking delivery status now.");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to send invite. Please try again."));
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setLastEmailId(null);
      setLastStatus(null);
      setSelectedPatientId("");
      setFreeEmail("");
      setFreeName("");
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
              {selectedPatient?.parentEmail && hasPlaceholderRecipient && (
                <p className="text-sm text-destructive">
                  This patient has a placeholder email on file. Use a real caregiver email address.
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
                {hasPlaceholderRecipient && (
                  <p className="text-sm text-destructive">
                    Use a real caregiver email address, not `example.com` or another test domain.
                  </p>
                )}
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
                Vocali &lt;onboarding@resend.dev&gt;
              </p>
              <p className="text-on-surface-variant">
                <span className="font-medium text-on-surface">To:</span>{" "}
                {toName ? `${toName} <${toEmail}>` : toEmail}
              </p>
              <p className="text-on-surface-variant">
                <span className="font-medium text-on-surface">Subject:</span>{" "}
                You&apos;ve been invited to a therapy session
              </p>
            </div>
          )}

          {lastStatus && (
            <div className="rounded-lg border border-outline-variant bg-surface-container-high p-4 text-sm">
              <p className="font-medium text-on-surface">
                Delivery status: {formatStatusLabel(lastStatus.status)}
              </p>
              {lastStatus.errorMessage && (
                <p className="mt-1 text-destructive">{lastStatus.errorMessage}</p>
              )}
              {!FINAL_INVITE_STATUSES.has(lastStatus.status) && (
                <p className="mt-1 text-on-surface-variant">
                  Waiting for Resend webhook updates from Convex.
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSend}
              disabled={!canSend || hasPlaceholderRecipient || sending}
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
