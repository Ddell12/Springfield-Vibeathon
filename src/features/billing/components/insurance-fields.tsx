"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface InsuranceFieldsProps {
  patientId: Id<"patients">;
  initialValues?: {
    insuranceCarrier?: string;
    insuranceMemberId?: string;
    insuranceGroupNumber?: string;
    insurancePhone?: string;
  };
}

export function InsuranceFields({ patientId, initialValues }: InsuranceFieldsProps) {
  const updatePatient = useMutation(api.patients.update);
  const [saving, setSaving] = useState(false);
  const [carrier, setCarrier] = useState(initialValues?.insuranceCarrier ?? "");
  const [memberId, setMemberId] = useState(initialValues?.insuranceMemberId ?? "");
  const [groupNumber, setGroupNumber] = useState(initialValues?.insuranceGroupNumber ?? "");
  const [phone, setPhone] = useState(initialValues?.insurancePhone ?? "");

  async function handleSave() {
    setSaving(true);
    try {
      await updatePatient({
        patientId,
        insuranceCarrier: carrier || undefined,
        insuranceMemberId: memberId || undefined,
        insuranceGroupNumber: groupNumber || undefined,
        insurancePhone: phone || undefined,
      });
      toast.success("Insurance information saved");
    } catch {
      toast.error("Failed to save insurance information");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <h4 className="font-body text-sm font-semibold text-on-surface">Insurance Information</h4>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="insurance-carrier">Carrier Name</Label>
          <Input
            id="insurance-carrier"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            placeholder="e.g. Blue Cross Blue Shield"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="insurance-member-id">Member / Subscriber ID</Label>
          <Input
            id="insurance-member-id"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            placeholder="e.g. BCB123456789"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="insurance-group">Group Number</Label>
          <Input
            id="insurance-group"
            value={groupNumber}
            onChange={(e) => setGroupNumber(e.target.value)}
            placeholder="e.g. GRP001"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="insurance-phone">Claims Phone</Label>
          <Input
            id="insurance-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 1-800-555-0100"
          />
        </div>
      </div>
      <Button
        onClick={handleSave}
        disabled={saving}
        size="sm"
        className="bg-primary-gradient text-white"
      >
        {saving ? "Saving..." : "Save Insurance Info"}
      </Button>
    </div>
  );
}
