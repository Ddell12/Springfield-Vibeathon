"use client";

import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/core/utils";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
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
import { ToggleGroup, ToggleGroupItem } from "@/shared/components/ui/toggle-group";
import { MaterialIcon } from "@/shared/components/material-icon";
import { toast } from "sonner";
import { DIAGNOSIS_VALUES, DIAGNOSIS_LABELS, type DiagnosisValue } from "@/shared/lib/diagnosis";

const DIAGNOSES = DIAGNOSIS_VALUES.map((value) => ({
  value,
  label: DIAGNOSIS_LABELS[value],
}));

const COMMUNICATION_LEVELS = [
  { value: "pre-verbal", label: "Pre-verbal" },
  { value: "single-words", label: "Single Words" },
  { value: "phrases", label: "Phrases" },
  { value: "sentences", label: "Sentences" },
] as const;

type Diagnosis = DiagnosisValue;
type CommLevel = (typeof COMMUNICATION_LEVELS)[number]["value"];

export function PatientIntakeForm() {
  const router = useRouter();
  const createPatient = useMutation(api.patients.create);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [diagnosis, setDiagnosis] = useState<Diagnosis | "">("");
  const [showOptional, setShowOptional] = useState(false);
  const [communicationLevel, setCommunicationLevel] = useState<CommLevel | "">("");
  const [parentEmail, setParentEmail] = useState("");
  const [interestInput, setInterestInput] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [sensoryNotes, setSensoryNotes] = useState("");
  const [behavioralNotes, setBehavioralNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Success state
  const [createdResult, setCreatedResult] = useState<{
    patientId: string;
    inviteToken?: string;
  } | null>(null);

  function addInterest() {
    const trimmed = interestInput.trim();
    if (trimmed && interests.length < 20 && trimmed.length <= 50) {
      setInterests([...interests, trimmed]);
      setInterestInput("");
    }
  }

  function removeInterest(index: number) {
    setInterests(interests.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = "First name is required";
    if (!lastName.trim()) newErrors.lastName = "Last name is required";
    if (!dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
    if (!diagnosis) newErrors.diagnosis = "Diagnosis is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createPatient({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth,
        diagnosis: diagnosis as Diagnosis,
        ...(communicationLevel ? { communicationLevel: communicationLevel as CommLevel } : {}),
        ...(parentEmail.trim() ? { parentEmail: parentEmail.trim() } : {}),
        ...(interests.length > 0 ? { interests } : {}),
        ...(sensoryNotes.trim() ? { sensoryNotes: sensoryNotes.trim() } : {}),
        ...(behavioralNotes.trim() ? { behavioralNotes: behavioralNotes.trim() } : {}),
      });
      setCreatedResult(result);
      toast.success("Patient added to your caseload");
    } catch (err) {
      let msg = "Failed to create patient";
      if (err instanceof ConvexError) {
        msg = typeof err.data === "string" ? err.data : msg;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Success screen
  if (createdResult) {
    const inviteUrl = createdResult.inviteToken
      ? `${window.location.origin}/invite/${createdResult.inviteToken}`
      : null;

    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-16">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-container">
          <MaterialIcon icon="check_circle" size="lg" className="text-success" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          {firstName} has been added
        </h1>

        {inviteUrl && (
          <div className="w-full rounded-xl bg-surface-container p-4">
            <p className="mb-2 text-sm font-medium text-foreground">
              Share this invite link with the caregiver:
            </p>
            <div className="flex gap-2">
              <Input value={inviteUrl} readOnly className="text-sm" />
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(inviteUrl);
                  toast.success("Link copied");
                }}
              >
                <MaterialIcon icon="content_copy" size="sm" />
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push("/patients")}>
            View Caseload
          </Button>
          <Button onClick={() => {
            setCreatedResult(null);
            setFirstName("");
            setLastName("");
            setDateOfBirth("");
            setDiagnosis("");
            setShowOptional(false);
            setCommunicationLevel("");
            setParentEmail("");
            setInterests([]);
            setSensoryNotes("");
            setBehavioralNotes("");
          }}>
            Add Another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Add Patient</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Step 1: Required fields */}
        <div className="flex flex-col gap-4 rounded-xl bg-surface-container p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={cn(errors.firstName && "border-destructive")}
              />
              {errors.firstName && <p className="mt-1 text-xs text-destructive">{errors.firstName}</p>}
            </div>
            <div>
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={cn(errors.lastName && "border-destructive")}
              />
              {errors.lastName && <p className="mt-1 text-xs text-destructive">{errors.lastName}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="dob">Date of birth</Label>
            <Input
              id="dob"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className={cn(errors.dateOfBirth && "border-destructive")}
            />
            {errors.dateOfBirth && <p className="mt-1 text-xs text-destructive">{errors.dateOfBirth}</p>}
          </div>

          <div>
            <Label htmlFor="diagnosis">Primary diagnosis</Label>
            <Select value={diagnosis} onValueChange={(v) => setDiagnosis(v as Diagnosis)}>
              <SelectTrigger id="diagnosis" className={cn(errors.diagnosis && "border-destructive")}>
                <SelectValue placeholder="Select diagnosis" />
              </SelectTrigger>
              <SelectContent>
                {DIAGNOSES.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.diagnosis && <p className="mt-1 text-xs text-destructive">{errors.diagnosis}</p>}
          </div>
        </div>

        {/* Step 2: Optional (collapsible) */}
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => setShowOptional(!showOptional)}
          className="flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors duration-300"
        >
          <MaterialIcon
            icon={showOptional ? "expand_less" : "expand_more"}
            size="sm"
          />
          Additional details (optional)
        </Button>

        {showOptional && (
          <div className="flex flex-col gap-4 rounded-xl bg-surface-container p-6">
            <div>
              <Label>Communication level</Label>
              <ToggleGroup
                type="single"
                value={communicationLevel}
                onValueChange={(value) => setCommunicationLevel(value as CommLevel | "")}
                className="mt-2 flex flex-wrap gap-2"
              >
                {COMMUNICATION_LEVELS.map((level) => (
                  <ToggleGroupItem
                    key={level.value}
                    value={level.value}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-300",
                      "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest",
                      "data-[state=on]:bg-primary data-[state=on]:text-white"
                    )}
                  >
                    {level.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <div>
              <Label htmlFor="interests">Interests & themes</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  id="interests"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addInterest(); }
                  }}
                  placeholder="Type and press Enter"
                />
                <Button type="button" variant="outline" size="sm" onClick={addInterest}>
                  Add
                </Button>
              </div>
              {interests.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {interests.map((interest, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="bg-primary/10 text-primary gap-1"
                    >
                      {interest}
                      <Button variant="ghost" size="icon-xs" type="button" onClick={() => removeInterest(i)} className="hover:text-destructive">
                        <MaterialIcon icon="close" size="sm" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="parentEmail">Caregiver email</Label>
              <Input
                id="parentEmail"
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                placeholder="parent@example.com"
              />
              <p className="mt-1 text-xs text-on-surface-variant">
                An invite link will be generated for them to connect.
              </p>
            </div>

            <div>
              <Label htmlFor="sensory">Sensory notes</Label>
              <Textarea
                id="sensory"
                value={sensoryNotes}
                onChange={(e) => setSensoryNotes(e.target.value)}
                placeholder="Any sensory sensitivities or preferences..."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="behavioral">Behavioral notes</Label>
              <Textarea
                id="behavioral"
                value={behavioralNotes}
                onChange={(e) => setBehavioralNotes(e.target.value)}
                placeholder="Relevant behavioral observations..."
                rows={2}
              />
            </div>
          </div>
        )}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Adding..." : "Add Patient"}
        </Button>
      </form>
    </div>
  );
}
