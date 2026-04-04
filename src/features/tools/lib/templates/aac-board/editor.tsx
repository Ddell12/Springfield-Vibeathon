"use client";

import { nanoid } from "nanoid";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";

import type { EditorProps } from "../../registry";
import { type AACBoardConfig, type AACButton,WORD_CATEGORIES } from "./schema";

const CATEGORY_LABELS: Record<string, string> = {
  verb:       "Verb / action (green)",
  pronoun:    "Pronoun / person (yellow)",
  noun:       "Noun / thing (orange)",
  descriptor: "Describing word (blue)",
  social:     "Social phrase (pink)",
  core:       "Core / function word (white)",
};

export function AACBoardEditor({ config, onChange }: EditorProps<AACBoardConfig>) {
  // Defensive: buttons may be missing if config arrived before schema parse completed
  const buttons = config.buttons ?? [];

  const set = <K extends keyof AACBoardConfig>(key: K, value: AACBoardConfig[K]) =>
    onChange({ ...config, [key]: value });

  const updateButton = (id: string, patch: Partial<AACButton>) =>
    onChange({ ...config, buttons: buttons.map((b) => (b.id === id ? { ...b, ...patch } : b)) });

  const addButton = () =>
    onChange({ ...config, buttons: [...buttons, { id: nanoid(), label: "New Button", speakText: "New Button" }] });

  const removeButton = (id: string) =>
    onChange({ ...config, buttons: buttons.filter((b) => b.id !== id) });

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="board-title">Board title</Label>
        <Input id="board-title" value={config.title}
          onChange={(e) => set("title", e.target.value)} placeholder="e.g. Snack Requests" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="grid-cols">Columns</Label>
          <Select value={String(config.gridCols)} onValueChange={(v) => set("gridCols", Number(v))}>
            <SelectTrigger id="grid-cols"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2, 3, 4, 5, 6].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="grid-rows">Rows</Label>
          <Select value={String(config.gridRows)} onValueChange={(v) => set("gridRows", Number(v))}>
            <SelectTrigger id="grid-rows"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="show-labels">Show text labels</Label>
          <Switch id="show-labels" checked={config.showTextLabels} onCheckedChange={(v) => set("showTextLabels", v)} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="auto-speak">Speak on tap</Label>
          <Switch id="auto-speak" checked={config.autoSpeak} onCheckedChange={(v) => set("autoSpeak", v)} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="sentence-strip">Sentence strip</Label>
          <Switch id="sentence-strip" checked={config.sentenceStripEnabled}
            onCheckedChange={(v) => set("sentenceStripEnabled", v)} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="high-contrast">High contrast</Label>
          <Switch id="high-contrast" checked={config.highContrast} onCheckedChange={(v) => set("highContrast", v)} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label>Buttons ({buttons.length})</Label>
          <Button variant="outline" size="sm" onClick={addButton}>Add button</Button>
        </div>

        {buttons.map((button, i) => (
          <div key={button.id} className="border border-border rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Button {i + 1}</span>
              <Button variant="ghost" size="sm" aria-label="Remove button"
                onClick={() => removeButton(button.id)}
                className="h-6 text-muted-foreground hover:text-destructive">
                Remove
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Label</Label>
                <Input value={button.label}
                  onChange={(e) => updateButton(button.id, { label: e.target.value })}
                  placeholder="e.g. Crackers" className="h-8 text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Spoken phrase</Label>
                <Input value={button.speakText}
                  onChange={(e) => updateButton(button.id, { speakText: e.target.value })}
                  placeholder="e.g. I want crackers" className="h-8 text-sm" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Word category (Fitzgerald color)</Label>
              <Select
                value={button.wordCategory ?? "__none__"}
                onValueChange={(v) =>
                  updateButton(button.id, { wordCategory: v === "__none__" ? undefined : v as AACButton["wordCategory"] })
                }
              >
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {WORD_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Image URL (optional)</Label>
              <Input value={button.imageUrl ?? ""}
                onChange={(e) => updateButton(button.id, { imageUrl: e.target.value || undefined })}
                placeholder="https://..." className="h-8 text-sm" type="url" />
            </div>
          </div>
        ))}

        {buttons.length > config.gridCols * config.gridRows && (
          <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            {buttons.length - config.gridCols * config.gridRows} button(s) exceed
            the {config.gridCols}×{config.gridRows} grid and won&apos;t be visible.
          </p>
        )}
      </div>
    </div>
  );
}
