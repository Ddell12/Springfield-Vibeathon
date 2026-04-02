"use client";

import { nanoid } from "nanoid";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";

import type { EditorProps } from "../../registry";
import type { AACBoardConfig, AACButton } from "./schema";

export function AACBoardEditor({ config, onChange }: EditorProps<AACBoardConfig>) {
  const set = <K extends keyof AACBoardConfig>(key: K, value: AACBoardConfig[K]) =>
    onChange({ ...config, [key]: value });

  const updateButton = (id: string, patch: Partial<AACButton>) =>
    onChange({
      ...config,
      buttons: config.buttons.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    });

  const addButton = () =>
    onChange({
      ...config,
      buttons: [
        ...config.buttons,
        { id: nanoid(), label: "New Button", speakText: "New Button" },
      ],
    });

  const removeButton = (id: string) =>
    onChange({ ...config, buttons: config.buttons.filter((b) => b.id !== id) });

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="board-title">Board title</Label>
        <Input
          id="board-title"
          value={config.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="e.g. Snack Requests"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="grid-cols">Columns</Label>
          <Select
            value={String(config.gridCols)}
            onValueChange={(v) => set("gridCols", Number(v))}
          >
            <SelectTrigger id="grid-cols"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2, 3, 4, 5, 6].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="grid-rows">Rows</Label>
          <Select
            value={String(config.gridRows)}
            onValueChange={(v) => set("gridRows", Number(v))}
          >
            <SelectTrigger id="grid-rows"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="show-labels">Show text labels</Label>
          <Switch id="show-labels" checked={config.showTextLabels}
            onCheckedChange={(v) => set("showTextLabels", v)} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="auto-speak">Speak on tap</Label>
          <Switch id="auto-speak" checked={config.autoSpeak}
            onCheckedChange={(v) => set("autoSpeak", v)} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="high-contrast">High contrast</Label>
          <Switch id="high-contrast" checked={config.highContrast}
            onCheckedChange={(v) => set("highContrast", v)} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label>Buttons ({config.buttons.length})</Label>
          <Button variant="outline" size="sm" onClick={addButton}>
            Add button
          </Button>
        </div>

        {config.buttons.map((button, i) => (
          <div key={button.id} className="border border-border rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Button {i + 1}</span>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Remove button"
                onClick={() => removeButton(button.id)}
                className="h-6 text-muted-foreground hover:text-destructive"
              >
                Remove
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Label</Label>
                <Input
                  value={button.label}
                  onChange={(e) => updateButton(button.id, { label: e.target.value })}
                  placeholder="e.g. Crackers"
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Spoken phrase</Label>
                <Input
                  value={button.speakText}
                  onChange={(e) => updateButton(button.id, { speakText: e.target.value })}
                  placeholder="e.g. I want crackers"
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
