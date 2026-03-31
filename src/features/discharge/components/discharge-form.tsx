"use client";

import { startTransition, useEffect, useState } from "react";
import { toast } from "sonner";

import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";

import type { Id } from "../../../../convex/_generated/dataModel";
import { useActiveGoals } from "../../goals/hooks/use-goals";
import {
  useCreateDischargeSummary,
  useDischargeGeneration,
  useSignDischargeSummary,
  useUpdateDischargeSummary,
} from "../hooks/use-discharge-summary";

const DISCHARGE_REASONS = [
  { value: "goals-met", label: "Goals Met" },
  { value: "plateau", label: "Plateau" },
  { value: "family-request", label: "Family Request" },
  { value: "insurance-exhausted", label: "Insurance Exhausted" },
  { value: "transition", label: "Transition" },
  { value: "other", label: "Other" },
] as const;

type DischargeReason = (typeof DISCHARGE_REASONS)[number]["value"];

interface DischargeFormProps {
  patientId: Id<"patients">;
  onComplete?: () => void;
}

export function DischargeForm({ patientId, onComplete }: DischargeFormProps) {
  const createDischarge = useCreateDischargeSummary();
  const updateDischarge = useUpdateDischargeSummary();
  const signDischarge = useSignDischargeSummary();
  const aiGen = useDischargeGeneration();
  const goals = useActiveGoals(patientId);

  const [reason, setReason] = useState<DischargeReason>("goals-met");
  const [reasonOther, setReasonOther] = useState("");
  const [narrative, setNarrative] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [returnCriteria, setReturnCriteria] = useState("");
  const [dischargeId, setDischargeId] = useState<Id<"dischargeSummaries"> | null>(null);
  const [goalOutcomes, setGoalOutcomes] = useState<
    Record<string, { met: boolean; finalAccuracy: number; reason: string }>
  >({});

  useEffect(() => {
    if (aiGen.result) {
      startTransition(() => {
        setNarrative(aiGen.result!.narrative);
        setRecommendations(aiGen.result!.recommendations);
      });
    }
  }, [aiGen.result]);

  const goalsAchieved = Object.entries(goalOutcomes)
    .filter(([, v]) => v.met)
    .map(([goalId, v]) => ({
      goalId,
      shortDescription: goals?.find((g) => g._id === goalId)?.shortDescription ?? "",
      finalAccuracy: v.finalAccuracy,
    }));

  const goalsNotMet = Object.entries(goalOutcomes)
    .filter(([, v]) => !v.met && v.finalAccuracy > 0)
    .map(([goalId, v]) => ({
      goalId,
      shortDescription: goals?.find((g) => g._id === goalId)?.shortDescription ?? "",
      finalAccuracy: v.finalAccuracy,
      reason: v.reason,
    }));

  async function handleCreate() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const id = await createDischarge({
        patientId,
        serviceStartDate: today,
        serviceEndDate: today,
        presentingDiagnosis: "",
        goalsAchieved,
        goalsNotMet,
        dischargeReason: reason,
        dischargeReasonOther: reason === "other" ? reasonOther : undefined,
        narrative,
        recommendations,
        returnCriteria: returnCriteria || undefined,
      });
      setDischargeId(id);
      toast.success("Discharge summary created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    }
  }

  async function handleGenerate() {
    if (!dischargeId) {
      toast.error("Create the discharge summary first");
      return;
    }
    try {
      await aiGen.generate(dischargeId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate");
    }
  }

  async function handleSign() {
    if (!dischargeId) return;
    try {
      if (narrative) {
        await updateDischarge({
          dischargeId,
          narrative,
          recommendations,
          returnCriteria: returnCriteria || undefined,
        });
      }
      await signDischarge({ dischargeId });
      toast.success("Discharge summary signed");
      onComplete?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sign");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Goal Outcomes */}
      <div className="flex flex-col gap-3">
        <Label className="text-sm font-semibold">Goal Outcomes</Label>
        <p className="text-xs text-muted-foreground">
          For each goal, indicate whether it was met and the final accuracy.
        </p>
        {goals?.map((goal) => {
          const outcome = goalOutcomes[goal._id];
          return (
            <div key={goal._id} className="rounded-lg border border-border p-3">
              <p className="mb-2 text-sm font-medium">{goal.shortDescription}</p>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={outcome?.met ?? false}
                    onCheckedChange={(checked) =>
                      setGoalOutcomes((prev) => ({
                        ...prev,
                        [goal._id]: { met: !!checked, finalAccuracy: prev[goal._id]?.finalAccuracy ?? 0, reason: prev[goal._id]?.reason ?? "" },
                      }))
                    }
                  />
                  Goal met
                </label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="0"
                    value={outcome?.finalAccuracy ?? ""}
                    onChange={(e) =>
                      setGoalOutcomes((prev) => ({
                        ...prev,
                        [goal._id]: { met: prev[goal._id]?.met ?? false, finalAccuracy: Number(e.target.value), reason: prev[goal._id]?.reason ?? "" },
                      }))
                    }
                    className="h-8 w-20 text-sm"
                  />
                  <span className="text-sm text-muted-foreground">% final accuracy</span>
                </div>
                {!outcome?.met && (
                  <Input
                    placeholder="Reason not met..."
                    value={outcome?.reason ?? ""}
                    onChange={(e) =>
                      setGoalOutcomes((prev) => ({
                        ...prev,
                        [goal._id]: { ...prev[goal._id]!, reason: e.target.value },
                      }))
                    }
                    className="h-8 flex-1 text-sm"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-on-surface">Discharge Reason</label>
        <div className="flex flex-wrap gap-2">
          {DISCHARGE_REASONS.map((r) => (
            <Button
              key={r.value}
              variant={reason === r.value ? "default" : "outline"}
              size="sm"
              onClick={() => setReason(r.value)}
              className={reason === r.value ? "bg-primary-gradient text-white" : ""}
            >
              {r.label}
            </Button>
          ))}
        </div>
        {reason === "other" && (
          <Textarea
            rows={2}
            value={reasonOther}
            onChange={(e) => setReasonOther(e.target.value)}
            placeholder="Describe the reason"
            className="mt-2"
          />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-on-surface">Narrative</label>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={aiGen.status === "generating" || !dischargeId}
          >
            <MaterialIcon icon="auto_awesome" size="sm" />
            {aiGen.status === "generating" ? "Generating..." : "Generate with AI"}
          </Button>
        </div>
        <Textarea
          rows={6}
          value={aiGen.status === "generating" ? aiGen.streamedText : narrative}
          onChange={(e) => setNarrative(e.target.value)}
          placeholder="Summary of treatment course"
          disabled={aiGen.status === "generating"}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-on-surface">Recommendations</label>
        <Textarea rows={4} value={recommendations} onChange={(e) => setRecommendations(e.target.value)} placeholder="Post-discharge recommendations" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-on-surface">Return Criteria (optional)</label>
        <Textarea rows={2} value={returnCriteria} onChange={(e) => setReturnCriteria(e.target.value)} placeholder="When should the patient return to therapy?" />
      </div>

      <div className="flex items-center justify-end gap-2">
        {!dischargeId ? (
          <Button onClick={handleCreate} className="bg-primary-gradient text-white">
            <MaterialIcon icon="add" size="sm" />
            Create Discharge Summary
          </Button>
        ) : (
          <Button
            onClick={handleSign}
            disabled={!narrative || !recommendations}
            className="bg-primary-gradient text-white"
          >
            <MaterialIcon icon="verified" size="sm" />
            Sign Discharge Summary
          </Button>
        )}
      </div>
    </div>
  );
}
