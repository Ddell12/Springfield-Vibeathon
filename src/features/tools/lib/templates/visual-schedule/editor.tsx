"use client";

import { nanoid } from "nanoid";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";

import type { EditorProps } from "../../registry";
import type { ScheduleItem,VisualScheduleConfig } from "./schema";

export function VisualScheduleEditor({ config, onChange }: EditorProps<VisualScheduleConfig>) {
  const set = <K extends keyof VisualScheduleConfig>(key: K, value: VisualScheduleConfig[K]) =>
    onChange({ ...config, [key]: value });

  const updateItem = (id: string, patch: Partial<ScheduleItem>) =>
    onChange({
      ...config,
      items: config.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });

  const addItem = () =>
    onChange({
      ...config,
      items: [...config.items, { id: nanoid(), label: "New step" }],
    });

  const removeItem = (id: string) =>
    onChange({ ...config, items: config.items.filter((item) => item.id !== id) });

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="vs-title">Schedule title</Label>
        <Input
          id="vs-title"
          value={config.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="e.g. Morning Routine"
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="vs-show-checkmarks">Show checkmarks</Label>
          <Switch
            id="vs-show-checkmarks"
            checked={config.showCheckmarks}
            onCheckedChange={(v) => set("showCheckmarks", v)}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="vs-show-duration">Show duration</Label>
          <Switch
            id="vs-show-duration"
            checked={config.showDuration}
            onCheckedChange={(v) => set("showDuration", v)}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="vs-high-contrast">High contrast</Label>
          <Switch
            id="vs-high-contrast"
            checked={config.highContrast}
            onCheckedChange={(v) => set("highContrast", v)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label>Steps ({config.items.length})</Label>
          <Button variant="outline" size="sm" onClick={addItem}>
            Add item
          </Button>
        </div>

        {config.items.map((item, i) => (
          <div key={item.id} className="border border-border rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Step {i + 1}</span>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Remove item"
                onClick={() => removeItem(item.id)}
                className="h-6 text-muted-foreground hover:text-destructive"
              >
                Remove
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Label</Label>
                <Input
                  value={item.label}
                  onChange={(e) => updateItem(item.id, { label: e.target.value })}
                  placeholder="e.g. Get dressed"
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Duration (min)</Label>
                <Input
                  type="number"
                  min={1}
                  max={120}
                  value={item.durationMinutes ?? ""}
                  onChange={(e) =>
                    updateItem(item.id, {
                      durationMinutes: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="Optional"
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
