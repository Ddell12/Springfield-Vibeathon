"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { MaterialIcon } from "@/shared/components/material-icon";
import { useCaregiverLinks } from "../hooks/use-patients";
import { toast } from "sonner";
import type { Id } from "../../../../convex/_generated/dataModel";

interface CaregiverInfoProps {
  patientId: Id<"patients">;
}

export function CaregiverInfo({ patientId }: CaregiverInfoProps) {
  const links = useCaregiverLinks(patientId);
  const createInvite = useMutation(api.caregivers.createInvite);
  const revokeInvite = useMutation(api.caregivers.revokeInvite);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setIsInviting(true);
    try {
      const token = await createInvite({ patientId, email: email.trim() });
      setInviteUrl(`${window.location.origin}/invite/${token}`);
      setEmail("");
      toast.success("Invite created");
    } catch {
      toast.error("Failed to create invite");
    } finally {
      setIsInviting(false);
    }
  }

  async function handleRevoke(token: string) {
    try {
      await revokeInvite({ token });
      toast.success("Invite revoked");
    } catch {
      toast.error("Failed to revoke invite");
    }
  }

  return (
    <div className="rounded-xl bg-surface-container p-6">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Caregivers</h3>

      {links === undefined ? (
        <p className="text-xs text-on-surface-variant">Loading...</p>
      ) : links.length === 0 && !showForm ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <p className="text-sm text-on-surface-variant">No caregivers linked</p>
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <MaterialIcon icon="person_add" size="sm" />
            Invite a caregiver
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {links?.map((link) => (
            <div key={link._id} className="flex items-center gap-3 rounded-lg bg-surface-container-high p-3">
              <MaterialIcon
                icon={link.inviteStatus === "accepted" ? "how_to_reg" : "pending"}
                size="sm"
                className="text-on-surface-variant"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{link.email}</p>
                <p className="text-xs text-on-surface-variant capitalize">
                  {link.relationship ?? "caregiver"} — {link.inviteStatus}
                </p>
              </div>
              {link.inviteStatus === "pending" && (
                <Button size="sm" variant="ghost" onClick={() => handleRevoke(link.inviteToken)}>
                  <MaterialIcon icon="close" size="sm" />
                </Button>
              )}
            </div>
          ))}

          {!showForm && (
            <Button size="sm" variant="outline" className="self-start" onClick={() => setShowForm(true)}>
              <MaterialIcon icon="person_add" size="sm" />
              Add another
            </Button>
          )}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleInvite} className="mt-3 flex flex-col gap-2">
          <Label htmlFor="caregiverEmail" className="text-xs">Caregiver email</Label>
          <div className="flex gap-2">
            <Input
              id="caregiverEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="parent@example.com"
              className="text-sm"
            />
            <Button type="submit" size="sm" disabled={isInviting}>
              {isInviting ? "..." : "Invite"}
            </Button>
          </div>
        </form>
      )}

      {inviteUrl && (
        <div className="mt-3 rounded-lg bg-surface-container-high p-3">
          <p className="mb-1 text-xs font-medium text-foreground">Share this link:</p>
          <div className="flex gap-2">
            <Input value={inviteUrl} readOnly className="text-xs" />
            <Button size="sm" variant="outline" onClick={() => {
              navigator.clipboard.writeText(inviteUrl);
              toast.success("Link copied");
            }}>
              <MaterialIcon icon="content_copy" size="sm" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
