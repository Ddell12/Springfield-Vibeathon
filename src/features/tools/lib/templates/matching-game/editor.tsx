"use client";

import { nanoid } from "nanoid";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";

import type { EditorProps } from "../../registry";
import type { MatchingGameConfig, MatchPair } from "./schema";

export function MatchingGameEditor({ config, onChange }: EditorProps<MatchingGameConfig>) {
  const set = <K extends keyof MatchingGameConfig>(key: K, value: MatchingGameConfig[K]) =>
    onChange({ ...config, [key]: value });

  const updatePair = (id: string, patch: Partial<MatchPair>) =>
    onChange({
      ...config,
      pairs: config.pairs.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });

  const addPair = () =>
    onChange({
      ...config,
      pairs: [...config.pairs, { id: nanoid(), prompt: "Word", answer: "Answer" }],
    });

  const removePair = (id: string) =>
    onChange({ ...config, pairs: config.pairs.filter((p) => p.id !== id) });

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mg-title">Game title</Label>
        <Input
          id="mg-title"
          value={config.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="e.g. Animal Sounds"
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="mg-celebrate">Celebrate correct answers</Label>
          <Switch
            id="mg-celebrate"
            checked={config.celebrateCorrect}
            onCheckedChange={(v) => set("celebrateCorrect", v)}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="mg-high-contrast">High contrast</Label>
          <Switch
            id="mg-high-contrast"
            checked={config.highContrast}
            onCheckedChange={(v) => set("highContrast", v)}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="mg-show-answer-images">Show answer images</Label>
          <Switch
            id="mg-show-answer-images"
            checked={config.showAnswerImages}
            onCheckedChange={(v) => set("showAnswerImages", v)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label>Pairs ({config.pairs.length})</Label>
          <Button variant="outline" size="sm" onClick={addPair}>
            Add pair
          </Button>
        </div>

        {config.pairs.map((pair, i) => (
          <div key={pair.id} className="border border-border rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Pair {i + 1}</span>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Remove pair"
                onClick={() => removePair(pair.id)}
                className="h-6 text-muted-foreground hover:text-destructive"
              >
                Remove
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Prompt</Label>
                <Input
                  value={pair.prompt}
                  onChange={(e) => updatePair(pair.id, { prompt: e.target.value })}
                  placeholder="e.g. Dog"
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Answer</Label>
                <Input
                  value={pair.answer}
                  onChange={(e) => updatePair(pair.id, { answer: e.target.value })}
                  placeholder="e.g. Woof"
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
