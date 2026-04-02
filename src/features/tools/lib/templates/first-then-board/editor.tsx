"use client";

import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";

import type { EditorProps } from "../../registry";
import type { FirstThenBoardConfig } from "./schema";

export function FirstThenBoardEditor({ config, onChange }: EditorProps<FirstThenBoardConfig>) {
  const set = <K extends keyof FirstThenBoardConfig>(key: K, value: FirstThenBoardConfig[K]) =>
    onChange({ ...config, [key]: value });

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ftb-title">Board title</Label>
        <Input
          id="ftb-title"
          value={config.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="e.g. First / Then"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ftb-first-label">First task</Label>
          <Input
            id="ftb-first-label"
            value={config.firstLabel}
            onChange={(e) => set("firstLabel", e.target.value)}
            placeholder="e.g. Brush teeth"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ftb-then-label">Then reward</Label>
          <Input
            id="ftb-then-label"
            value={config.thenLabel}
            onChange={(e) => set("thenLabel", e.target.value)}
            placeholder="e.g. iPad time"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ftb-first-color">First card color</Label>
          <Input
            id="ftb-first-color"
            type="color"
            value={config.firstColor}
            onChange={(e) => set("firstColor", e.target.value)}
            className="h-10 cursor-pointer"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ftb-then-color">Then card color</Label>
          <Input
            id="ftb-then-color"
            type="color"
            value={config.thenColor}
            onChange={(e) => set("thenColor", e.target.value)}
            className="h-10 cursor-pointer"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="ftb-show-checkmark">Show checkmark when done</Label>
          <Switch
            id="ftb-show-checkmark"
            checked={config.showCheckmark}
            onCheckedChange={(v) => set("showCheckmark", v)}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="ftb-high-contrast">High contrast</Label>
          <Switch
            id="ftb-high-contrast"
            checked={config.highContrast}
            onCheckedChange={(v) => set("highContrast", v)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ftb-first-image">First task image URL (optional)</Label>
          <Input
            id="ftb-first-image"
            value={config.firstImageUrl ?? ""}
            onChange={(e) =>
              set("firstImageUrl", e.target.value || undefined)
            }
            placeholder="https://..."
            type="url"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ftb-then-image">Then reward image URL (optional)</Label>
          <Input
            id="ftb-then-image"
            value={config.thenImageUrl ?? ""}
            onChange={(e) =>
              set("thenImageUrl", e.target.value || undefined)
            }
            placeholder="https://..."
            type="url"
          />
        </div>
      </div>
    </div>
  );
}
