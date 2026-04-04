"use client";

import { nanoid } from "nanoid";
import { useCallback, useState } from "react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import type { PageProps } from "@/features/tools/lib/registry";

import type { AACBoardConfig, AACButton } from "./schema";
import { AACBoardConfigSchema, WORD_CATEGORIES } from "./schema";

const CATEGORY_COLORS: Record<string, string> = {
  verb:       "bg-[#22c55e] text-white",
  pronoun:    "bg-[#eab308] text-white",
  noun:       "bg-[#f97316] text-white",
  descriptor: "bg-[#3b82f6] text-white",
  social:     "bg-[#ec4899] text-white",
  core:       "bg-muted text-foreground",
};

const CATEGORY_LABELS: Record<string, string> = {
  verb:       "Verbs (green)",
  pronoun:    "Pronouns (yellow)",
  noun:       "Nouns (orange)",
  descriptor: "Descriptors (blue)",
  social:     "Social (pink)",
  core:       "Core words",
};

export function AACBoardWordBankPage({
  config: initialConfig,
  data,
}: PageProps<AACBoardConfig>) {
  const raw = data.get<unknown>("config", initialConfig);
  const config = (() => {
    const parsed = AACBoardConfigSchema.safeParse(raw);
    return parsed.success ? parsed.data : initialConfig;
  })();

  const buttons = config.buttons ?? [];

  const save = (updated: AACButton[]) =>
    data.set("config", { ...config, buttons: updated });

  const addButton = (category: AACButton["wordCategory"]) => {
    const newBtn: AACButton = {
      id: nanoid(),
      label: "New word",
      speakText: "New word",
      wordCategory: category,
    };
    save([...buttons, newBtn]);
  };

  const removeButton = (id: string) =>
    save(buttons.filter((b) => b.id !== id));

  const commitLabel = useCallback(
    (id: string, label: string) =>
      save(buttons.map((b) => (b.id === id ? { ...b, label, speakText: label } : b))),
    [buttons, save]
  );

  return (
    <div className="flex flex-col gap-6 overflow-y-auto p-4">
      <p className="text-sm text-muted-foreground">
        Words are grouped by Fitzgerald key color. Changes save when you leave the field.
      </p>

      {WORD_CATEGORIES.map((cat) => {
        const catButtons = buttons.filter((b) => b.wordCategory === cat);
        return (
          <section key={cat} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">
                {CATEGORY_LABELS[cat]}
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addButton(cat)}
              >
                + Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {catButtons.length === 0 && (
                <p className="text-xs text-muted-foreground">No words yet.</p>
              )}
              {catButtons.map((btn) => (
                <WordBadge
                  key={btn.id}
                  btn={btn}
                  colorClass={CATEGORY_COLORS[cat]}
                  onCommit={commitLabel}
                  onRemove={removeButton}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function WordBadge({
  btn,
  colorClass,
  onCommit,
  onRemove,
}: {
  btn: AACButton;
  colorClass: string;
  onCommit: (id: string, label: string) => void;
  onRemove: (id: string) => void;
}) {
  const [local, setLocal] = useState(btn.label);

  return (
    <div className="flex items-center gap-1">
      <Badge className={colorClass}>
        <input
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => {
            if (local !== btn.label) onCommit(btn.id, local);
          }}
          className="w-20 bg-transparent text-xs outline-none"
        />
      </Badge>
      <button
        type="button"
        onClick={() => onRemove(btn.id)}
        aria-label={`Remove ${btn.label}`}
        className="text-muted-foreground hover:text-destructive text-xs"
      >
        ✕
      </button>
    </div>
  );
}
