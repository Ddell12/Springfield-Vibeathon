"use client";

import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";

import { buildTemplateFormFromSystemTemplate, SYSTEM_TEMPLATES } from "../lib/system-templates";
import { type SpeechCoachTemplateForm,TemplateEditor } from "./template-editor";

type Section = "mine" | "system";

export function TemplateLibraryPage() {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Doc<"speechCoachTemplates">["_id"] | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("mine");
  const templates = useQuery(api.speechCoachTemplates.listMine, {});
  const createTemplate = useMutation(api.speechCoachTemplates.create);
  const updateTemplate = useMutation(api.speechCoachTemplates.update);
  const duplicateTemplate = useMutation(api.speechCoachTemplates.duplicate);

  async function handleSave(template: SpeechCoachTemplateForm) {
    await createTemplate({ template });
    setCreating(false);
    toast.success("Template created");
  }

  async function handleUpdate(templateId: Doc<"speechCoachTemplates">["_id"], template: SpeechCoachTemplateForm) {
    await updateTemplate({ templateId, template });
    setEditing(null);
    toast.success("Template saved");
  }

  async function handleDuplicate(templateId: Doc<"speechCoachTemplates">["_id"]) {
    await duplicateTemplate({ templateId });
    toast.success("Template duplicated");
  }

  async function handleCreateFromSystemTemplate(systemTemplateId: string) {
    const template = SYSTEM_TEMPLATES.find((item) => item.id === systemTemplateId);
    if (!template) {
      toast.error("That system template could not be loaded.");
      return;
    }

    await createTemplate({ template: buildTemplateFormFromSystemTemplate(template) });
    setActiveSection("mine");
    toast.success("System template duplicated into My Templates");
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl text-foreground">Speech Coach Templates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Save reusable coach setups for different speech practice styles.
          </p>
        </div>
        {!creating && (
          <Button
            type="button"
            onClick={() => {
              setCreating(true);
              setActiveSection("mine");
            }}
            className="bg-gradient-to-br from-[#00595c] to-[#0d7377] font-semibold"
          >
            New template
          </Button>
        )}
      </div>

      <div className="flex gap-1 rounded-full bg-surface-container p-1 w-fit">
        {(["mine", "system"] as const).map((section) => (
          <button
            key={section}
            type="button"
            onClick={() => setActiveSection(section)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              activeSection === section
                ? "bg-white text-on-surface shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            {section === "mine" ? "My Templates" : "System Templates"}
          </button>
        ))}
      </div>

      {creating && (
        <div className="rounded-xl bg-card p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-headline text-xl text-foreground">New template</h2>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
          <TemplateEditor initialTemplate={null} onSave={handleSave} />
        </div>
      )}

      {templates === undefined && (
        <p className="text-sm text-muted-foreground">Loading templates…</p>
      )}

      {activeSection === "mine" && templates?.length === 0 && !creating && (
        <div className="rounded-xl bg-muted px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            No templates yet. Create one or duplicate a system template to get started.
          </p>
          <Button type="button" onClick={() => setCreating(true)} className="mt-4">
            Create first template
          </Button>
        </div>
      )}

      {activeSection === "mine" && templates && templates.length > 0 && (
        <ul className="flex flex-col gap-3">
          {templates.map((t: Doc<"speechCoachTemplates">) => (
            <li key={t._id} className="rounded-xl bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-headline text-lg text-foreground">
                    {t.name || "Untitled template"}
                  </p>
                  {t.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">{t.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="mt-1 shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                    {t.status}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing((current) => (current === t._id ? null : t._id))}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleDuplicate(t._id)}
                  >
                    Duplicate
                  </Button>
                </div>
              </div>
              {editing === t._id && (
                <div className="mt-4 rounded-xl bg-background p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="font-headline text-xl text-foreground">Edit template</h2>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                  <TemplateEditor
                    initialTemplate={{
                      ...t,
                      name: t.name || "",
                    }}
                    onSave={(template) => handleUpdate(t._id, template)}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {activeSection === "system" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Built-in starting points. Duplicate one into My Templates, then edit it for your caseload.
          </p>
          {SYSTEM_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className="flex items-start justify-between gap-4 rounded-xl bg-card p-4"
            >
              <div>
                <p className="font-headline text-lg text-foreground">{template.name}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {template.description}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {template.sessionDefaults.defaultDurationMinutes} min · Ages{" "}
                  {template.sessionDefaults.ageRange}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleCreateFromSystemTemplate(template.id)}
              >
                Duplicate
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
