"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { usePatient } from "@/shared/clinical";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";

import type { Id } from "../../../../convex/_generated/dataModel";
import {
  useCreateEvaluation,
  useEvalGeneration,
  useEvaluation,
  useSignEvaluation,
  useUnsignEvaluation,
  useUpdateEvaluation,
  useUpdateEvaluationStatus,
} from "../hooks/use-evaluations";
import { ICD10Picker } from "./icd10-picker";

interface EvaluationEditorProps {
  patientId: string;
  evalId?: string;
}

const PROGNOSIS_OPTIONS = ["excellent", "good", "fair", "guarded"] as const;

export function EvaluationEditor({ patientId, evalId }: EvaluationEditorProps) {
  const router = useRouter();
  const typedPatientId = patientId as Id<"patients">;
  const typedEvalId = evalId ? (evalId as Id<"evaluations">) : null;

  const patient = usePatient(typedPatientId);
  const existingEval = useEvaluation(typedEvalId);
  const createEval = useCreateEvaluation();
  const updateEval = useUpdateEvaluation();
  const updateStatus = useUpdateEvaluationStatus();
  const signEval = useSignEvaluation();
  const unsignEval = useUnsignEvaluation();
  const aiGen = useEvalGeneration();

  const [evaluationDate, setEvaluationDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [referralSource, setReferralSource] = useState("");
  const [backgroundHistory, setBackgroundHistory] = useState("");
  const [behavioralObservations, setBehavioralObservations] = useState("");
  const [clinicalInterpretation, setClinicalInterpretation] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [diagnosisCodes, setDiagnosisCodes] = useState<
    { code: string; description: string }[]
  >([]);
  const [prognosis, setPrognosis] = useState<(typeof PROGNOSIS_OPTIONS)[number]>("good");
  const [currentEvalId, setCurrentEvalId] = useState<Id<"evaluations"> | null>(typedEvalId);

  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current || !existingEval) return;
    hasInitialized.current = true;
    setEvaluationDate(existingEval.evaluationDate);
    setReferralSource(existingEval.referralSource ?? "");
    setBackgroundHistory(existingEval.backgroundHistory);
    setBehavioralObservations(existingEval.behavioralObservations);
    setClinicalInterpretation(existingEval.clinicalInterpretation);
    setRecommendations(existingEval.recommendations);
    setDiagnosisCodes(existingEval.diagnosisCodes);
    setPrognosis(existingEval.prognosis);
  }, [existingEval]);

  useEffect(() => {
    if (aiGen.result) {
      setClinicalInterpretation(aiGen.result.clinicalInterpretation);
      setRecommendations(aiGen.result.recommendations);
    }
  }, [aiGen.result]);

  const isSigned = existingEval?.status === "signed";

  async function handleSave() {
    try {
      if (currentEvalId) {
        await updateEval({
          evalId: currentEvalId,
          evaluationDate,
          referralSource: referralSource || undefined,
          backgroundHistory,
          behavioralObservations,
          clinicalInterpretation,
          recommendations,
          diagnosisCodes,
          prognosis,
          assessmentTools: existingEval?.assessmentTools ?? [],
          domainFindings: existingEval?.domainFindings ?? {},
        });
        toast.success("Evaluation saved");
      } else {
        const newId = await createEval({
          patientId: typedPatientId,
          evaluationDate,
          referralSource: referralSource || undefined,
          backgroundHistory,
          assessmentTools: [],
          domainFindings: {},
          behavioralObservations,
          clinicalInterpretation,
          diagnosisCodes,
          prognosis,
          recommendations,
        });
        setCurrentEvalId(newId);
        router.replace(`/patients/${patientId}/evaluations/${newId}`);
        toast.success("Evaluation created");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  }

  async function handleGenerate() {
    if (!currentEvalId) {
      toast.error("Save the evaluation first");
      return;
    }
    try {
      await aiGen.generate(currentEvalId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate");
    }
  }

  async function handleSign() {
    if (!currentEvalId) return;
    try {
      await updateStatus({ evalId: currentEvalId, status: "complete" });
      await signEval({ evalId: currentEvalId });
      toast.success("Evaluation signed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sign");
    }
  }

  async function handleUnsign() {
    if (!currentEvalId) return;
    try {
      await unsignEval({ evalId: currentEvalId });
      toast.success("Evaluation unsigned");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to unsign");
    }
  }

  if (patient === undefined || (typedEvalId && existingEval === undefined)) {
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
          {evalId ? "Edit Evaluation" : "New Evaluation"}
        </h1>
      </div>

      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-on-surface">Evaluation Date</label>
            <Input type="date" value={evaluationDate} onChange={(e) => setEvaluationDate(e.target.value)} disabled={isSigned} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-on-surface">Referral Source</label>
            <Input value={referralSource} onChange={(e) => setReferralSource(e.target.value)} placeholder="e.g. Pediatrician" disabled={isSigned} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-on-surface">Background History</label>
          <Textarea rows={4} value={backgroundHistory} onChange={(e) => setBackgroundHistory(e.target.value)} placeholder="Developmental history, prior services, chief complaint" disabled={isSigned} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-on-surface">Behavioral Observations</label>
          <Textarea rows={3} value={behavioralObservations} onChange={(e) => setBehavioralObservations(e.target.value)} placeholder="Clinical observations during evaluation" disabled={isSigned} />
        </div>

        <ICD10Picker selected={diagnosisCodes} onChange={setDiagnosisCodes} disabled={isSigned} />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-on-surface">Prognosis</label>
          <div className="flex gap-2">
            {PROGNOSIS_OPTIONS.map((p) => (
              <Button
                key={p}
                variant={prognosis === p ? "default" : "outline"}
                size="sm"
                onClick={() => setPrognosis(p)}
                disabled={isSigned}
                className={prognosis === p ? "bg-primary-gradient text-white" : ""}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-on-surface">Clinical Interpretation</label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={isSigned || aiGen.status === "generating" || !currentEvalId}
            >
              <MaterialIcon icon="auto_awesome" size="sm" />
              {aiGen.status === "generating" ? "Generating..." : "Generate with AI"}
            </Button>
          </div>
          <Textarea
            rows={6}
            value={aiGen.status === "generating" ? aiGen.streamedText : clinicalInterpretation}
            onChange={(e) => setClinicalInterpretation(e.target.value)}
            placeholder="AI-assisted narrative interpreting scores and observations"
            disabled={isSigned || aiGen.status === "generating"}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-on-surface">Recommendations</label>
          <Textarea rows={4} value={recommendations} onChange={(e) => setRecommendations(e.target.value)} placeholder="Services recommended, referrals, accommodations" disabled={isSigned} />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
          <Button onClick={handleSave} disabled={isSigned}>
            <MaterialIcon icon="save" size="sm" />
            Save
          </Button>
          <div className="flex items-center gap-2">
            {isSigned ? (
              <Button variant="outline" onClick={handleUnsign}>
                <MaterialIcon icon="lock_open" size="sm" />
                Unsign
              </Button>
            ) : (
              <Button
                onClick={handleSign}
                disabled={!currentEvalId || !clinicalInterpretation || !recommendations}
                className="bg-primary-gradient text-white"
              >
                <MaterialIcon icon="verified" size="sm" />
                Sign Evaluation
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
