"use client";

import { useState } from "react";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";

import type { SpeechCoachSkillKey, SpeechCoachToolKey } from "../lib/template-types";

export type SpeechCoachTemplateForm = {
  name: string;
  description: string;
  status: "draft" | "active" | "archived";
  voice: { provider: "elevenlabs" | "gemini-native"; voiceKey: string };
  prompt: {
    baseExtension?: string;
    coachingStyle?: string;
    toolInstructions?: string;
    knowledgeInstructions?: string;
  };
  tools: Array<{ key: SpeechCoachToolKey; enabled: boolean; instructions?: string }>;
  skills: Array<{ key: SpeechCoachSkillKey; enabled: boolean }>;
  knowledgePackIds: string[];
  customKnowledgeSnippets: string[];
  sessionDefaults: { ageRange: "2-4" | "5-7"; defaultDurationMinutes: number };
  version: number;
};

const TOOL_OPTIONS: Array<{ key: SpeechCoachToolKey; label: string }> = [
  { key: "target-word-picker", label: "Target word picker" },
  { key: "minimal-pair-generator", label: "Minimal pair generator" },
  { key: "topic-prompt-generator", label: "Topic prompt generator" },
  { key: "pacing-adjuster", label: "Pacing adjuster" },
  { key: "reinforcement-helper", label: "Reinforcement helper" },
  { key: "session-summary", label: "Session summary" },
  { key: "caregiver-handoff", label: "Caregiver handoff" },
];

const SKILL_OPTIONS: Array<{ key: SpeechCoachSkillKey; label: string }> = [
  { key: "auditory-bombardment", label: "Auditory bombardment" },
  { key: "model-then-imitate", label: "Model then imitate" },
  { key: "recast-and-retry", label: "Recast and retry" },
  { key: "choice-based-elicitation", label: "Choice-based elicitation" },
  { key: "carryover-conversation", label: "Carryover conversation" },
  { key: "low-frustration-fallback", label: "Low-frustration fallback" },
];

const DEFAULT_TOOLS = TOOL_OPTIONS.map((t) => ({ key: t.key, enabled: false }));
const DEFAULT_SKILLS = SKILL_OPTIONS.map((s) => ({ key: s.key, enabled: false }));

export function TemplateEditor({
  initialTemplate,
  onSave,
}: {
  initialTemplate: SpeechCoachTemplateForm | null;
  onSave: (template: SpeechCoachTemplateForm) => void | Promise<void>;
}) {
  const [name, setName] = useState(initialTemplate?.name ?? "");
  const [description, setDescription] = useState(initialTemplate?.description ?? "");
  const [ageRange, setAgeRange] = useState<"2-4" | "5-7">(
    initialTemplate?.sessionDefaults.ageRange ?? "5-7"
  );
  const [durationMinutes, setDurationMinutes] = useState(
    initialTemplate?.sessionDefaults.defaultDurationMinutes ?? 5
  );
  const [tools, setTools] = useState<SpeechCoachTemplateForm["tools"]>(
    initialTemplate?.tools ?? DEFAULT_TOOLS
  );
  const [skills, setSkills] = useState<SpeechCoachTemplateForm["skills"]>(
    initialTemplate?.skills ?? DEFAULT_SKILLS
  );

  function toggleTool(key: SpeechCoachToolKey) {
    setTools((prev) =>
      prev.map((t) => (t.key === key ? { ...t, enabled: !t.enabled } : t))
    );
  }

  function toggleSkill(key: SpeechCoachSkillKey) {
    setSkills((prev) =>
      prev.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s))
    );
  }

  function handleSave() {
    onSave({
      name,
      description,
      status: "draft",
      voice: initialTemplate?.voice ?? { provider: "elevenlabs", voiceKey: "friendly-coach" },
      prompt: initialTemplate?.prompt ?? {},
      tools,
      skills,
      knowledgePackIds: initialTemplate?.knowledgePackIds ?? [],
      customKnowledgeSnippets: initialTemplate?.customKnowledgeSnippets ?? [],
      sessionDefaults: { ageRange, defaultDurationMinutes: durationMinutes },
      version: initialTemplate?.version ?? 1,
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Name */}
      <section className="flex flex-col gap-2">
        <Label htmlFor="template-name">Template name</Label>
        <Input
          id="template-name"
          aria-label="Template name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Playful /s/ Coach"
          className="max-w-md"
        />
      </section>

      {/* Description */}
      <section className="flex flex-col gap-2">
        <Label htmlFor="template-description">Description</Label>
        <Textarea
          id="template-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Briefly describe when to use this template"
          className="max-w-md resize-none"
          rows={2}
        />
      </section>

      {/* Session defaults */}
      <section className="flex flex-col gap-3">
        <h2 className="font-headline text-xl text-foreground">Session defaults</h2>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Age range</Label>
            <div className="flex gap-2">
              {(["2-4", "5-7"] as const).map((range) => (
                <button
                  key={range}
                  type="button"
                  role="radio"
                  aria-checked={ageRange === range}
                  onClick={() => setAgeRange(range)}
                  className={cn(
                    "rounded-lg px-5 py-2 text-sm font-medium transition-colors duration-300",
                    ageRange === range
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  Ages {range}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Default duration</Label>
            <div className="flex gap-2">
              {([5, 10] as const).map((mins) => (
                <button
                  key={mins}
                  type="button"
                  role="radio"
                  aria-checked={durationMinutes === mins}
                  onClick={() => setDurationMinutes(mins)}
                  className={cn(
                    "rounded-lg px-5 py-2 text-sm font-medium transition-colors duration-300",
                    durationMinutes === mins
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tools */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-headline text-xl text-foreground">Tools</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enable the capabilities available to the coach during sessions.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {TOOL_OPTIONS.map((tool) => {
            const enabled = tools.find((t) => t.key === tool.key)?.enabled ?? false;
            return (
              <button
                key={tool.key}
                type="button"
                role="checkbox"
                aria-checked={enabled}
                aria-label={tool.label}
                onClick={() => toggleTool(tool.key)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors duration-300",
                  enabled
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                <span
                  className={cn(
                    "size-4 shrink-0 rounded border-2 transition-colors duration-300",
                    enabled ? "border-primary bg-primary" : "border-muted-foreground/40"
                  )}
                  aria-hidden
                />
                {tool.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Skills */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-headline text-xl text-foreground">Therapy skills</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select the techniques the coach should apply.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {SKILL_OPTIONS.map((skill) => {
            const enabled = skills.find((s) => s.key === skill.key)?.enabled ?? false;
            return (
              <button
                key={skill.key}
                type="button"
                role="checkbox"
                aria-checked={enabled}
                aria-label={skill.label}
                onClick={() => toggleSkill(skill.key)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors duration-300",
                  enabled
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                <span
                  className={cn(
                    "size-4 shrink-0 rounded border-2 transition-colors duration-300",
                    enabled ? "border-primary bg-primary" : "border-muted-foreground/40"
                  )}
                  aria-hidden
                />
                {skill.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Save */}
      <Button
        type="button"
        onClick={handleSave}
        className="w-full bg-gradient-to-br from-[#00595c] to-[#0d7377] py-5 text-base font-semibold"
      >
        Save template
      </Button>
    </div>
  );
}
