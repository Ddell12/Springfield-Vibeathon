"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { usePatient } from "@/shared/clinical";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";

import type { Id } from "@convex/_generated/dataModel";
import {
  useActivePlanOfCare,
  useAmendPlanOfCare,
  useCreatePlanOfCare,
  useSignPlanOfCare,
  useUpdatePlanOfCare,
} from "../hooks/use-plan-of-care";

interface POCEditorProps {
  patientId: string;
}

export function POCEditor({ patientId }: POCEditorProps) {
  const typedPatientId = patientId as Id<"patients">;
  const patient = usePatient(typedPatientId);
  const activePoc = useActivePlanOfCare(typedPatientId);
  const createPoc = useCreatePlanOfCare();
  const updatePoc = useUpdatePlanOfCare();
  const signPoc = useSignPlanOfCare();
  const amendPoc = useAmendPlanOfCare();

  const [frequency, setFrequency] = useState("2x/week");
  const [sessionDuration, setSessionDuration] = useState("45 minutes");
  const [planDuration, setPlanDuration] = useState("12 weeks");
  const [dischargeCriteria, setDischargeCriteria] = useState("");
  const [physicianName, setPhysicianName] = useState("");
  const [physicianNPI, setPhysicianNPI] = useState("");
  const [physicianSigOnFile, setPhysicianSigOnFile] = useState(false);
  const [currentPocId, setCurrentPocId] = useState<Id<"plansOfCare"> | null>(null);

  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current || !activePoc) return;
    hasInitialized.current = true;
    setFrequency(activePoc.frequency);
    setSessionDuration(activePoc.sessionDuration);
    setPlanDuration(activePoc.planDuration);
    setDischargeCriteria(activePoc.dischargeCriteria);
    setPhysicianName(activePoc.physicianName ?? "");
    setPhysicianNPI(activePoc.physicianNPI ?? "");
    setPhysicianSigOnFile(activePoc.physicianSignatureOnFile);
    setCurrentPocId(activePoc._id);
  }, [activePoc]);

  const isActive = activePoc?.status === "active";

  async function handleCreate() {
    try {
      const pocId = await createPoc({
        patientId: typedPatientId,
        diagnosisCodes: [],
        longTermGoals: [],
        shortTermGoals: [],
        frequency,
        sessionDuration,
        planDuration,
        dischargeCriteria,
        physicianName: physicianName || undefined,
        physicianNPI: physicianNPI || undefined,
        physicianSignatureOnFile: physicianSigOnFile,
      });
      setCurrentPocId(pocId);
      toast.success("Plan of Care created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    }
  }

  async function handleSave() {
    if (!currentPocId) return;
    try {
      await updatePoc({
        pocId: currentPocId,
        frequency,
        sessionDuration,
        planDuration,
        dischargeCriteria,
        physicianName: physicianName || undefined,
        physicianNPI: physicianNPI || undefined,
        physicianSignatureOnFile: physicianSigOnFile,
      });
      toast.success("Plan of Care saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  }

  async function handleSign() {
    if (!currentPocId) return;
    try {
      await signPoc({ pocId: currentPocId });
      toast.success("Plan of Care signed and activated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sign");
    }
  }

  async function handleAmend() {
    if (!currentPocId) return;
    try {
      const newPocId = await amendPoc({
        pocId: currentPocId,
        frequency,
        sessionDuration,
        planDuration,
        dischargeCriteria,
      });
      setCurrentPocId(newPocId);
      hasInitialized.current = false;
      toast.success("Plan of Care amended — new draft created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to amend");
    }
  }

  if (patient === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-muted-foreground">
          <MaterialIcon icon="progress_activity" className="animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3">
        <Link
          href={`/patients/${patientId}`}
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:text-foreground"
        >
          <MaterialIcon icon="arrow_back" size="sm" />
          Back to patient
        </Link>
        <h1 className="font-headline text-2xl font-bold text-on-surface">
          Plan of Care
          {activePoc ? ` (v${activePoc.version})` : ""}
        </h1>
      </div>

      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-on-surface">Frequency</label>
            <Input value={frequency} onChange={(e) => setFrequency(e.target.value)} disabled={isActive} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-on-surface">Session Duration</label>
            <Input value={sessionDuration} onChange={(e) => setSessionDuration(e.target.value)} disabled={isActive} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-on-surface">Plan Duration</label>
            <Input value={planDuration} onChange={(e) => setPlanDuration(e.target.value)} disabled={isActive} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-on-surface">Discharge Criteria</label>
          <Textarea rows={3} value={dischargeCriteria} onChange={(e) => setDischargeCriteria(e.target.value)} placeholder="When is the patient ready for discharge?" disabled={isActive} />
        </div>

        <div className="rounded-xl bg-muted/30 p-4">
          <h3 className="mb-3 text-sm font-semibold text-on-surface">Physician Signature</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-on-surface">Physician Name</label>
              <Input value={physicianName} onChange={(e) => setPhysicianName(e.target.value)} disabled={isActive} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-on-surface">NPI</label>
              <Input value={physicianNPI} onChange={(e) => setPhysicianNPI(e.target.value)} disabled={isActive} />
            </div>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-on-surface">
            <input type="checkbox" checked={physicianSigOnFile} onChange={(e) => setPhysicianSigOnFile(e.target.checked)} disabled={isActive} />
            Physician signature on file
          </label>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
          {!currentPocId ? (
            <Button onClick={handleCreate} className="bg-primary-gradient text-white">
              <MaterialIcon icon="add" size="sm" />
              Create Plan of Care
            </Button>
          ) : isActive ? (
            <Button onClick={handleAmend} variant="outline">
              <MaterialIcon icon="edit_note" size="sm" />
              Amend Plan of Care
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button onClick={handleSave}>
                <MaterialIcon icon="save" size="sm" />
                Save Draft
              </Button>
              <Button onClick={handleSign} className="bg-primary-gradient text-white">
                <MaterialIcon icon="verified" size="sm" />
                Sign and Activate
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
