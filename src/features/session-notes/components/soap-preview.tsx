"use client";

import { useState } from "react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";

export type SoapNote = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

type SoapSection = keyof SoapNote;

interface SoapPreviewProps {
  soapNote: SoapNote | null;
  streamedText: string;
  status: "idle" | "generating" | "complete" | "error";
  error: string | null;
  aiGenerated: boolean;
  disabled?: boolean;
  onEdit: (soap: SoapNote) => void;
  onRegenerate: () => void;
}

const SECTIONS: {
  key: SoapSection;
  label: string;
  icon: string;
}[] = [
  { key: "subjective", label: "Subjective", icon: "person" },
  { key: "objective", label: "Objective", icon: "analytics" },
  { key: "assessment", label: "Assessment", icon: "psychology" },
  { key: "plan", label: "Plan", icon: "checklist" },
];

export function SoapPreview({
  soapNote,
  streamedText,
  status,
  error,
  aiGenerated,
  disabled = false,
  onEdit,
  onRegenerate,
}: SoapPreviewProps) {
  const [editingSection, setEditingSection] = useState<SoapSection | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editedSections, setEditedSections] = useState<Set<SoapSection>>(
    new Set()
  );

  function startEditing(section: SoapSection) {
    if (disabled || !soapNote) return;
    setEditingSection(section);
    setEditValue(soapNote[section]);
  }

  function cancelEditing() {
    setEditingSection(null);
    setEditValue("");
  }

  function saveEditing() {
    if (!soapNote || !editingSection) return;
    const updated = { ...soapNote, [editingSection]: editValue };
    setEditedSections((prev) => new Set(prev).add(editingSection));
    onEdit(updated);
    setEditingSection(null);
    setEditValue("");
  }

  // Idle state
  if (status === "idle") {
    return (
      <div className="rounded-xl border-2 border-dashed border-muted-foreground/25 p-6 text-center">
        <MaterialIcon
          icon="clinical_notes"
          size="xl"
          className="mx-auto mb-2 text-muted-foreground/40"
        />
        <p className="text-sm text-muted-foreground">
          Fill in session data and click Generate SOAP Note to create
          documentation
        </p>
      </div>
    );
  }

  // Generating state
  if (status === "generating") {
    return (
      <div className="rounded-xl bg-surface-container p-6">
        <div className="mb-3 flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
          <p className="text-sm font-medium text-foreground">
            Generating SOAP note...
          </p>
        </div>
        {streamedText && (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {streamedText}
          </p>
        )}
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div className="rounded-xl bg-destructive/10 p-6">
        <div className="mb-3 flex items-center gap-2">
          <MaterialIcon
            icon="error"
            size="sm"
            className="text-destructive"
          />
          <p className="text-sm font-medium text-destructive">
            {error ?? "Failed to generate SOAP note"}
          </p>
        </div>
        {streamedText && (
          <p className="mb-4 whitespace-pre-wrap text-sm text-muted-foreground">
            {streamedText}
          </p>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          disabled={disabled}
        >
          <MaterialIcon icon="refresh" size="xs" />
          Try Again
        </Button>
      </div>
    );
  }

  // Complete state
  return (
    <div className="rounded-xl bg-surface-container p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground">SOAP Note</h3>
          {aiGenerated && (
            <Badge variant="secondary" className="text-[10px]">
              <MaterialIcon icon="auto_awesome" size="xs" />
              AI Generated
            </Badge>
          )}
          {editedSections.size > 0 && (
            <span className="text-[10px] italic text-muted-foreground">
              (edited)
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRegenerate}
          disabled={disabled}
        >
          <MaterialIcon icon="refresh" size="xs" />
          Regenerate
        </Button>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {SECTIONS.map(({ key, label, icon }) => (
          <div key={key}>
            <div className="mb-1 flex items-center gap-1.5">
              <MaterialIcon
                icon={icon}
                size="xs"
                className="text-muted-foreground"
              />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </span>
              {editedSections.has(key) && (
                <span className="text-[10px] italic text-muted-foreground">
                  (edited)
                </span>
              )}
            </div>

            {editingSection === key ? (
              <div className="space-y-2">
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  rows={4}
                  className="text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveEditing}>
                    Done
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={cancelEditing}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => startEditing(key)}
                disabled={disabled}
                className={cn(
                  "w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors duration-300",
                  disabled
                    ? "cursor-default"
                    : "hover:bg-surface-container-high"
                )}
              >
                {soapNote?.[key] || (
                  <span className="italic text-muted-foreground">Empty</span>
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
