"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";

import { templateRegistry } from "../../lib/registry";
import { QuickStartCards } from "./quick-start-cards";

interface ToolEntryPageProps {
  childProfile?: {
    ageRange?: string;
    interests?: string[];
    communicationLevel?: string;
  };
}

export function ToolEntryPage({ childProfile }: ToolEntryPageProps) {
  const router = useRouter();
  const createInstance = useMutation(api.tools.create);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleBuildIt = async () => {
    const desc = description.trim();
    if (!desc) return;

    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/tools/infer-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: desc, childProfile }),
      });

      if (!res.ok) {
        setStatus("error");
        setError("Couldn't build the tool. Try describing it differently.");
        return;
      }

      const { templateType, configJson, suggestedTitle } = (await res.json()) as {
        templateType: string;
        configJson: string;
        suggestedTitle: string;
      };

      const id = await createInstance({
        templateType,
        title: suggestedTitle,
        configJson,
        originalDescription: desc,
      });

      router.push(`/tools/${id as Id<"app_instances">}`);
    } catch {
      setStatus("error");
      setError("Something went wrong. Please try again.");
    }
  };

  const handleQuickStart = async (templateType: string) => {
    setStatus("loading");
    setError(null);
    try {
      const reg = templateRegistry[templateType];
      const id = await createInstance({
        templateType,
        title: reg.meta.name,
        configJson: JSON.stringify(reg.defaultConfig),
      });
      router.push(`/tools/${id as Id<"app_instances">}`);
    } catch {
      setStatus("error");
      setError("Something went wrong. Please try again.");
    }
  };

  const isLoading = status === "loading";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 gap-8">
      <div className="w-full max-w-xl flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-display font-semibold text-foreground">
            What do you want to build?
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Describe the tool in plain language — AI will pick the right type and
            set it up for you.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Textarea
            ref={textareaRef}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={`e.g. "Token board for Marcus, 5 tokens, reward is iPad time. He loves dinosaurs."`}
            rows={4}
            className="text-sm resize-none"
            disabled={isLoading}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                void handleBuildIt();
              }
            }}
          />

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            size="lg"
            onClick={() => void handleBuildIt()}
            disabled={!description.trim() || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Building your tool…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Build it
              </>
            )}
          </Button>
        </div>

        <QuickStartCards onSelect={(t) => void handleQuickStart(t)} disabled={isLoading} />
      </div>
    </div>
  );
}
