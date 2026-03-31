// src/features/evaluations/components/domain-findings-form.tsx
"use client";

import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";

const DOMAINS = [
  { key: "articulation", label: "Articulation / Phonology" },
  { key: "languageReceptive", label: "Receptive Language" },
  { key: "languageExpressive", label: "Expressive Language" },
  { key: "fluency", label: "Fluency" },
  { key: "voice", label: "Voice / Resonance" },
  { key: "pragmatics", label: "Pragmatics / Social Language" },
  { key: "aac", label: "AAC / Augmentative Communication" },
] as const;

type DomainKey = (typeof DOMAINS)[number]["key"];

export type DomainFindings = Partial<
  Record<DomainKey, { narrative: string; scores?: string }>
>;

interface DomainFindingsFormProps {
  value: DomainFindings;
  onChange: (findings: DomainFindings) => void;
  disabled?: boolean;
}

export function DomainFindingsForm({ value, onChange, disabled }: DomainFindingsFormProps) {
  function updateDomain(key: DomainKey, patch: { narrative?: string; scores?: string }) {
    const existing = value[key] ?? { narrative: "" };
    onChange({ ...value, [key]: { ...existing, ...patch } });
  }

  return (
    <div className="flex flex-col gap-5">
      {DOMAINS.map(({ key, label }) => (
        <div key={key} className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground">{label}</Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Textarea
              placeholder={`Findings for ${label.toLowerCase()}...`}
              value={value[key]?.narrative ?? ""}
              onChange={(e) => updateDomain(key, { narrative: e.target.value })}
              disabled={disabled}
              rows={3}
              className="resize-none sm:col-span-2"
            />
            <Textarea
              placeholder="Scores (optional)"
              value={value[key]?.scores ?? ""}
              onChange={(e) => updateDomain(key, { scores: e.target.value })}
              disabled={disabled}
              rows={3}
              className="resize-none text-sm"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
