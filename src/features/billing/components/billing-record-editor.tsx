"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { toast } from "sonner";

import { MaterialIcon } from "@/shared/components/material-icon";
import { Badge } from "@/shared/components/ui/badge";
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
import { Textarea } from "@/shared/components/ui/textarea";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ICD10Picker } from "@/features/evaluations/components/icd10-picker";
import { useBillingMutations, useBillingRecord } from "../hooks/use-billing-records";
import { MODIFIERS } from "../lib/modifiers";
import { PLACES_OF_SERVICE } from "../lib/place-of-service";
import { CptCodePicker } from "./cpt-code-picker";

interface BillingRecordEditorProps {
  recordId?: Id<"billingRecords"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BillingRecordEditor({ recordId, open, onOpenChange }: BillingRecordEditorProps) {
  const isCreateMode = !recordId;
  const record = useBillingRecord(recordId ?? undefined);
  const patients = useQuery(api.patients.list, isCreateMode ? { status: "active" } : "skip");
  const { createRecord, updateRecord, finalizeRecord } = useBillingMutations();
  const [saving, setSaving] = useState(false);

  // Create-mode fields
  const [selectedPatientId, setSelectedPatientId] = useState<Id<"patients"> | "">("");
  const [dateOfService, setDateOfService] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  const [cptCode, setCptCode] = useState("");
  const [cptDescription, setCptDescription] = useState("");
  const [modifiers, setModifiers] = useState<string[]>([]);
  const [diagnosisCodes, setDiagnosisCodes] = useState<
    { code: string; description: string }[]
  >([]);
  const [placeOfService, setPlaceOfService] = useState("");
  const [units, setUnits] = useState(1);
  const [fee, setFee] = useState("");
  const [notes, setNotes] = useState("");
  const [initialized, setInitialized] = useState(false);

  if (record && !initialized) {
    setCptCode(record.cptCode);
    setCptDescription(record.cptDescription);
    const initialModifiers = record.modifiers.includes("GP")
      ? [...record.modifiers]
      : ["GP", ...record.modifiers];
    setModifiers(initialModifiers);
    setDiagnosisCodes(record.diagnosisCodes ?? []);
    setPlaceOfService(record.placeOfService);
    setUnits(record.units);
    setFee(record.fee ? (record.fee / 100).toFixed(2) : "");
    setNotes(record.notes ?? "");
    setInitialized(true);
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setInitialized(false);
      setSelectedPatientId("");
      setDateOfService(new Date().toISOString().split("T")[0]);
      // Reset shared fields so create mode starts fresh on reopen
      setCptCode("");
      setCptDescription("");
      setModifiers([]);
      setDiagnosisCodes([]);
      setPlaceOfService("");
      setUnits(1);
      setFee("");
      setNotes("");
    }
    onOpenChange(open);
  }

  function toggleModifier(code: string) {
    setModifiers((prev) =>
      prev.includes(code) ? prev.filter((m) => m !== code) : [...prev, code]
    );
  }

  async function handleSave() {
    if (isCreateMode && !selectedPatientId) {
      toast.error("Please select a patient");
      return;
    }
    setSaving(true);
    try {
      const feeInCents = fee ? Math.round(parseFloat(fee) * 100) : undefined;
      if (isCreateMode) {
        await createRecord({
          patientId: selectedPatientId as Id<"patients">,
          dateOfService,
          cptCode: cptCode || undefined,
          cptDescription: cptDescription || undefined,
          modifiers,
          diagnosisCodes,
          placeOfService: placeOfService || undefined,
          units,
          fee: feeInCents,
          notes: notes || undefined,
        });
        toast.success("Billing record created");
      } else {
        await updateRecord({
          recordId: recordId!,
          cptCode,
          cptDescription,
          modifiers,
          diagnosisCodes,
          placeOfService,
          units,
          fee: feeInCents,
          notes: notes || undefined,
        });
        toast.success("Billing record updated");
      }
      handleOpenChange(false);
    } catch {
      toast.error(isCreateMode ? "Failed to create billing record" : "Failed to update billing record");
    } finally {
      setSaving(false);
    }
  }

  async function handleFinalize() {
    if (isCreateMode) return;
    setSaving(true);
    try {
      const feeInCents = fee ? Math.round(parseFloat(fee) * 100) : undefined;
      await updateRecord({
        recordId: recordId!,
        cptCode,
        cptDescription,
        modifiers,
        diagnosisCodes,
        placeOfService,
        units,
        fee: feeInCents,
        notes: notes || undefined,
      });
      await finalizeRecord({ recordId: recordId! });
      toast.success("Billing record finalized");
      handleOpenChange(false);
    } catch {
      toast.error("Failed to finalize billing record");
    } finally {
      setSaving(false);
    }
  }

  const isDraft = isCreateMode || record?.status === "draft";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isCreateMode ? "New Billing Record" : "Edit Billing Record"}
          </DialogTitle>
          <DialogDescription>
            {isCreateMode
              ? "Create a manual billing record for an evaluation, phone call, or consultation."
              : record?.dateOfService
                ? `Service date: ${record.dateOfService}`
                : "Loading..."}
          </DialogDescription>
        </DialogHeader>

        {!isCreateMode && !record ? (
          <div className="animate-pulse h-48 rounded-xl bg-surface-container" />
        ) : (
          <div className="space-y-4">
            {isCreateMode && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="billing-patient">Patient</Label>
                  <Select
                    value={selectedPatientId}
                    onValueChange={(v) => setSelectedPatientId(v as Id<"patients">)}
                  >
                    <SelectTrigger id="billing-patient">
                      <SelectValue placeholder="Select a patient..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(patients ?? []).map((p) => (
                        <SelectItem key={p._id} value={p._id}>
                          {p.firstName} {p.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="billing-date">Date of Service</Label>
                  <Input
                    id="billing-date"
                    type="date"
                    value={dateOfService}
                    onChange={(e) => setDateOfService(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label>CPT Code</Label>
              <CptCodePicker
                value={cptCode}
                onChange={(code, desc) => {
                  setCptCode(code);
                  setCptDescription(desc);
                }}
                disabled={!isDraft}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Modifiers</Label>
              <div className="flex flex-wrap gap-2">
                {MODIFIERS.map((m) => (
                  <Badge
                    key={m.code}
                    variant={modifiers.includes(m.code) ? "default" : "outline"}
                    className="cursor-pointer select-none"
                    onClick={() => isDraft && toggleModifier(m.code)}
                  >
                    {m.code}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Diagnosis Codes</Label>
              <ICD10Picker
                selected={diagnosisCodes}
                onChange={setDiagnosisCodes}
                disabled={!isDraft}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Place of Service</Label>
                <Select
                  value={placeOfService}
                  onValueChange={setPlaceOfService}
                  disabled={!isDraft}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLACES_OF_SERVICE.map((pos) => (
                      <SelectItem key={pos.code} value={pos.code}>
                        {pos.code} — {pos.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="billing-units">Units</Label>
                <Input
                  id="billing-units"
                  type="number"
                  min={1}
                  value={units}
                  onChange={(e) => setUnits(parseInt(e.target.value) || 1)}
                  disabled={!isDraft}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="billing-fee">Fee ($)</Label>
              <Input
                id="billing-fee"
                type="number"
                step="0.01"
                min="0"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="e.g. 150.00"
                disabled={!isDraft}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="billing-notes">Notes</Label>
              <Textarea
                id="billing-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal billing notes..."
                rows={2}
                disabled={!isDraft}
              />
            </div>

            {isDraft && (
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : isCreateMode ? "Create Draft" : "Save Draft"}
                </Button>
                {!isCreateMode && (
                  <Button
                    className="bg-primary-gradient text-white"
                    onClick={handleFinalize}
                    disabled={saving}
                  >
                    <MaterialIcon icon="check_circle" size="sm" />
                    {saving ? "Finalizing..." : "Finalize"}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
