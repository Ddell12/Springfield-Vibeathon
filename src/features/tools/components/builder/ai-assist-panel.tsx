"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";

import { useAIConfigAssist } from "../../hooks/use-ai-config-assist";
import { DEFAULT_GENERATION_PROFILE } from "../../lib/ai/generation-profile";

interface AIAssistPanelProps {
  templateType: string;
  childProfile: {
    ageRange?: string;
    interests?: string[];
    communicationLevel?: string;
  };
  onApply: (configJson: string) => void;
}

export function AIAssistPanel({ templateType, childProfile, onApply }: AIAssistPanelProps) {
  const [description, setDescription] = useState("");
  const { status, error, generate } = useAIConfigAssist({
    templateType,
    childProfile,
    generationProfile: DEFAULT_GENERATION_PROFILE,
  });

  const handleGenerate = async () => {
    if (!description.trim()) return;
    const configJson = await generate(description);
    if (configJson) onApply(configJson);
  };

  return (
    <div className="border border-border rounded-xl p-4 flex flex-col gap-3 bg-muted/30">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">AI assist</span>
        <span className="text-xs text-muted-foreground">— optional</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Describe the app you want and AI will draft a richer, session-ready setup for you to review.
      </p>
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={`e.g. "Snack request board for Liam. 6 buttons. Simple short phrases."`}
        rows={3}
        className="text-sm resize-none"
        disabled={status === "loading"}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        size="sm"
        onClick={handleGenerate}
        disabled={!description.trim() || status === "loading"}
        className="self-start"
      >
        {status === "loading" ? (
          <>
            <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <Sparkles className="w-3 h-3 mr-1.5" />
            Generate
          </>
        )}
      </Button>
    </div>
  );
}
