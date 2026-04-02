"use client";

import { useState } from "react";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";

import type { Id } from "../../../../convex/_generated/dataModel";

type TemplateOption = {
  _id: Id<"speechCoachTemplates">;
  name: string;
  version: number;
};

type ChildTemplateAssignment = {
  templateId: Id<"speechCoachTemplates">;
  templateVersion: number;
  childNotes: string;
};

export function TemplateAssignmentCard({
  templates,
  value,
  onSave,
}: {
  templates: TemplateOption[];
  value: ChildTemplateAssignment | null;
  onSave: (value: ChildTemplateAssignment) => void | Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState<Id<"speechCoachTemplates"> | null>(
    value?.templateId ?? null
  );
  const [childNotes, setChildNotes] = useState(value?.childNotes ?? "");

  function handleSave() {
    if (!selectedId) return;
    const template = templates.find((t) => t._id === selectedId);
    if (!template) return;
    onSave({
      templateId: selectedId,
      templateVersion: template.version,
      childNotes,
    });
  }

  return (
    <Card className="rounded-xl py-5">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Assigned Template</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-col gap-2">
          {templates.map((t) => (
            <button
              key={t._id}
              type="button"
              onClick={() => setSelectedId(t._id)}
              className={cn(
                "rounded-lg px-4 py-2 text-left text-sm transition-colors duration-300",
                selectedId === t._id
                  ? "bg-primary/10 text-primary"
                  : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
              )}
            >
              {t.name}
            </button>
          ))}
          {templates.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No templates yet. Create one in Speech Coach Templates.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="child-notes">Child notes</Label>
          <Textarea
            id="child-notes"
            aria-label="Child notes"
            value={childNotes}
            onChange={(e) => setChildNotes(e.target.value)}
            placeholder="e.g. Prefers animals, avoid loud sounds"
            rows={3}
          />
        </div>
        <Button type="button" onClick={handleSave} disabled={!selectedId}>
          Save assignment
        </Button>
      </CardContent>
    </Card>
  );
}
