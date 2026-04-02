"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { X } from "lucide-react";
import { useCallback, useState } from "react";

import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

interface GoalTagsEditorProps {
  instanceId: Id<"app_instances">;
  initialTags: string[];
}

export function GoalTagsEditor({ instanceId, initialTags }: GoalTagsEditorProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [input, setInput] = useState("");
  const updateTool = useMutation(api.tools.update);

  const persist = useCallback(
    (nextTags: string[]) => {
      void updateTool({ id: instanceId, goalTags: nextTags });
    },
    [instanceId, updateTool]
  );

  const addTag = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || tags.includes(trimmed)) {
      setInput("");
      return;
    }
    const next = [...tags, trimmed];
    setTags(next);
    persist(next);
    setInput("");
  }, [input, tags, persist]);

  const removeTag = useCallback(
    (tag: string) => {
      const next = tags.filter((t) => t !== tag);
      setTags(next);
      persist(next);
    },
    [tags, persist]
  );

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs font-medium">Goal tags</Label>
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              aria-label={`Remove ${tag}`}
              className="text-primary/60 hover:text-primary transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addTag();
          }
        }}
        placeholder="Add a goal tag… (press Enter)"
        className="h-8 text-xs"
      />
    </div>
  );
}
