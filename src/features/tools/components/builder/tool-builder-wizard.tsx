"use client";

import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

import type { useToolBuilder } from "../../hooks/use-tool-builder";
import { templateRegistry } from "../../lib/registry";
import { AIAssistPanel } from "./ai-assist-panel";
import { AppearanceControls } from "./appearance-controls";
import { ConfigEditor } from "./config-editor";
import { GoalTagsEditor } from "./goal-tags-editor";
import { PreviewPanel } from "./preview-panel";
import { PublishPanel } from "./publish-panel";
import { TemplatePicker } from "./template-picker";

type Builder = ReturnType<typeof useToolBuilder>;

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
}

interface ToolBuilderWizardProps {
  builder: Builder;
  patients: Patient[];
}

const STEP_LABELS = ["Choose context", "Choose template", "Customize", "Publish"];

export function ToolBuilderWizard({ builder, patients }: ToolBuilderWizardProps) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Step indicator */}
      <div className="border-b border-border bg-background px-6 py-3 shrink-0">
        <div className="flex items-center gap-2">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  i + 1 === builder.step
                    ? "bg-primary text-primary-foreground"
                    : i + 1 < builder.step
                    ? "bg-primary/30 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-sm hidden sm:inline ${
                  i + 1 === builder.step ? "text-foreground font-medium" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
              {i < STEP_LABELS.length - 1 && <div className="w-8 h-px bg-border mx-1" />}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Choose context */}
      {builder.step === 1 && (
        <div className="flex flex-col gap-6 p-6 max-w-md mx-auto w-full mt-8">
          <div>
            <h1 className="text-2xl font-display font-semibold">Who is this tool for?</h1>
            <p className="text-muted-foreground mt-1">Optionally assign this tool to a child from your caseload, or skip to build a general tool.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="patient-select">Child (optional)</Label>
            <Select
              value={builder.patientId ?? ""}
              onValueChange={(v) => builder.selectPatient(v as never)}
            >
              <SelectTrigger id="patient-select">
                <SelectValue placeholder="Select a child…" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.firstName} {p.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={builder.nextStep}>Continue without child</Button>
            <Button variant="outline" disabled={!builder.patientId} onClick={builder.nextStep}>
              Continue with selected child
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Choose template */}
      {builder.step === 2 && (
        <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full mt-8">
          <div>
            <h1 className="text-2xl font-display font-semibold">Choose a tool type</h1>
            <p className="text-muted-foreground mt-1">
              Each type has a preset layout and interaction style.
            </p>
          </div>
          <TemplatePicker
            onSelect={(type) => {
              builder.selectTemplate(type);
              builder.nextStep();
            }}
          />
          <Button variant="outline" onClick={builder.prevStep}>Back</Button>
        </div>
      )}

      {/* Step 3: Customize */}
      {builder.step === 3 && builder.templateType && (
        <>
          <div className="flex flex-1 overflow-hidden">
            <div className="w-1/2 overflow-y-auto border-r border-border flex flex-col">
              <div className="p-4 border-b border-border shrink-0">
                <AppearanceControls
                  value={builder.appearance}
                  onChange={builder.updateAppearance}
                />
              </div>
              <div className="p-4 border-b border-border shrink-0">
                <AIAssistPanel
                  templateType={builder.templateType}
                  childProfile={{}}
                  onApply={(configJson) => {
                    const reg = templateRegistry[builder.templateType!];
                    if (reg) builder.updateConfig(reg.parseConfig(configJson));
                  }}
                />
              </div>
              <div className="flex-1 overflow-y-auto">
                <ConfigEditor
                  templateType={builder.templateType}
                  config={builder.config}
                  onChange={builder.updateConfig}
                />
                {builder.instanceId && (
                  <div className="mt-6 pt-4 border-t border-border px-4 pb-4">
                    <GoalTagsEditor
                      instanceId={builder.instanceId}
                      initialTags={(builder.config as { goalTags?: string[] })?.goalTags ?? []}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="w-1/2 overflow-hidden">
              <PreviewPanel
                templateType={builder.templateType}
                config={builder.config}
              />
            </div>
          </div>
          <div className="border-t border-border px-6 py-3 flex items-center justify-between bg-background shrink-0">
            <Button variant="outline" onClick={builder.prevStep}>Back</Button>
            <Button
              onClick={async () => {
                await builder.saveAndAdvance();
                builder.nextStep();
              }}
              disabled={builder.isSaving}
            >
              {builder.isSaving ? "Saving…" : "Save & Publish →"}
            </Button>
          </div>
        </>
      )}

      {/* Step 4: Publish */}
      {builder.step === 4 && (
        <PublishPanel
          isSaving={builder.isSaving}
          publishedShareToken={builder.publishedShareToken}
          onPublish={builder.publish}
        />
      )}
    </div>
  );
}
