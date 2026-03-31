// src/features/evaluations/components/assessment-tools-form.tsx
"use client";

import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";

export interface AssessmentTool {
  name: string;
  scoresRaw?: string;
  scoresStandard?: string;
  percentile?: string;
  notes?: string;
}

interface AssessmentToolsFormProps {
  value: AssessmentTool[];
  onChange: (tools: AssessmentTool[]) => void;
  disabled?: boolean;
}

function emptyTool(): AssessmentTool {
  return { name: "", scoresRaw: "", scoresStandard: "", percentile: "", notes: "" };
}

export function AssessmentToolsForm({ value, onChange, disabled }: AssessmentToolsFormProps) {
  function update(index: number, patch: Partial<AssessmentTool>) {
    const next = value.map((t, i) => (i === index ? { ...t, ...patch } : t));
    onChange(next);
  }

  function addTool() {
    onChange([...value, emptyTool()]);
  }

  function removeTool(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-4">
      {value.map((tool, i) => (
        <div key={i} className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              Assessment {i + 1}
            </span>
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeTool(i)}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              >
                <MaterialIcon icon="close" className="text-base" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Assessment Tool Name</Label>
              <Input
                placeholder="e.g. GFTA-3, PPVT-5, CELF-5"
                value={tool.name}
                onChange={(e) => update(i, { name: e.target.value })}
                disabled={disabled}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Raw Score</Label>
              <Input
                placeholder="e.g. 42"
                value={tool.scoresRaw ?? ""}
                onChange={(e) => update(i, { scoresRaw: e.target.value })}
                disabled={disabled}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Standard Score</Label>
              <Input
                placeholder="e.g. 78"
                value={tool.scoresStandard ?? ""}
                onChange={(e) => update(i, { scoresStandard: e.target.value })}
                disabled={disabled}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Percentile</Label>
              <Input
                placeholder="e.g. 7th"
                value={tool.percentile ?? ""}
                onChange={(e) => update(i, { percentile: e.target.value })}
                disabled={disabled}
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea
                placeholder="Additional observations about this assessment..."
                value={tool.notes ?? ""}
                onChange={(e) => update(i, { notes: e.target.value })}
                disabled={disabled}
                rows={2}
                className="mt-1 resize-none"
              />
            </div>
          </div>
        </div>
      ))}

      {!disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addTool}
          className="w-fit"
        >
          <MaterialIcon icon="add" className="mr-1 text-base" />
          Add Assessment Tool
        </Button>
      )}

      {value.length === 0 && !disabled && (
        <p className="text-sm text-muted-foreground">
          No assessments added yet. Click &quot;Add Assessment Tool&quot; to document standardized test results.
        </p>
      )}
    </div>
  );
}
