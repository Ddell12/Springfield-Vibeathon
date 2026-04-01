"use client";

import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

import type { EditorProps } from "../../registry";
import type { TokenBoardConfig } from "./schema";

export function TokenBoardEditor({ config, onChange }: EditorProps<TokenBoardConfig>) {
  const set = <K extends keyof TokenBoardConfig>(key: K, value: TokenBoardConfig[K]) =>
    onChange({ ...config, [key]: value });

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tb-title">Board title</Label>
        <Input
          id="tb-title"
          value={config.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="e.g. Token Board"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tb-reward-label">Reward label</Label>
        <Input
          id="tb-reward-label"
          value={config.rewardLabel}
          onChange={(e) => set("rewardLabel", e.target.value)}
          placeholder="e.g. 5 minutes of free choice"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tb-token-count">Number of tokens</Label>
          <Input
            id="tb-token-count"
            type="number"
            min={3}
            max={10}
            value={config.tokenCount}
            onChange={(e) => set("tokenCount", Number(e.target.value))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tb-token-shape">Token shape</Label>
          <Select
            value={config.tokenShape}
            onValueChange={(v) => set("tokenShape", v as TokenBoardConfig["tokenShape"])}
          >
            <SelectTrigger id="tb-token-shape"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="star">Star ⭐</SelectItem>
              <SelectItem value="circle">Circle 🔵</SelectItem>
              <SelectItem value="heart">Heart ❤️</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tb-token-color">Token color</Label>
        <Input
          id="tb-token-color"
          type="color"
          value={config.tokenColor}
          onChange={(e) => set("tokenColor", e.target.value)}
          className="h-10 cursor-pointer"
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="tb-high-contrast">High contrast</Label>
          <Switch
            id="tb-high-contrast"
            checked={config.highContrast}
            onCheckedChange={(v) => set("highContrast", v)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tb-reward-image">Reward image URL (optional)</Label>
        <Input
          id="tb-reward-image"
          value={config.rewardImageUrl ?? ""}
          onChange={(e) =>
            set("rewardImageUrl", e.target.value || undefined)
          }
          placeholder="https://..."
          type="url"
        />
      </div>
    </div>
  );
}
