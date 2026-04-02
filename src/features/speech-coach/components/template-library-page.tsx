"use client";

import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/shared/components/ui/button";

import { type SpeechCoachTemplateForm,TemplateEditor } from "./template-editor";

export function TemplateLibraryPage() {
  const [creating, setCreating] = useState(false);
  const templates = useQuery(api.speechCoachTemplates.listMine, {});
  const createTemplate = useMutation(api.speechCoachTemplates.create);

  async function handleSave(template: SpeechCoachTemplateForm) {
    await createTemplate({ template });
    setCreating(false);
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
            onClick={() => setCreating(true)}
            className="bg-gradient-to-br from-[#00595c] to-[#0d7377] font-semibold"
          >
            New template
          </Button>
        )}
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

      {templates?.length === 0 && !creating && (
        <div className="rounded-xl bg-muted px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            No templates yet. Create one to get started.
          </p>
        </div>
      )}

      {templates && templates.length > 0 && (
        <ul className="flex flex-col gap-3">
          {templates.map((t: Doc<"speechCoachTemplates">) => (
            <li key={t._id} className="rounded-xl bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-headline text-lg text-foreground">{t.name}</p>
                  {t.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">{t.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="mt-1 shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                    {t.status}
                  </span>
                  <Button asChild type="button" variant="outline" size="sm">
                    <Link href={`/speech-coach?templateId=${t._id}&mode=preview`}>
                      Preview session
                    </Link>
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
