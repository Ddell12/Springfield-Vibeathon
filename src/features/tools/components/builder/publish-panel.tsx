"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";

import { Button } from "@/shared/components/ui/button";

interface PublishPanelProps {
  isSaving: boolean;
  publishedShareToken: string | null;
  onPublish: () => Promise<string | null>;
}

export function PublishPanel({ isSaving, publishedShareToken, onPublish }: PublishPanelProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = publishedShareToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/apps/${publishedShareToken}`
    : null;

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8 max-w-md mx-auto text-center">
      {!publishedShareToken ? (
        <>
          <h2 className="text-2xl font-display font-semibold">Ready to publish?</h2>
          <p className="text-muted-foreground">
            Publishing creates a shareable link for parents and caregivers.
            No login required to use it.
          </p>
          <Button size="lg" disabled={isSaving} onClick={() => void onPublish()}>
            {isSaving ? "Publishing…" : "Publish app"}
          </Button>
        </>
      ) : (
        <>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Check className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-headline font-semibold">App published</h2>
          <p className="text-muted-foreground">Share this link with a parent, caregiver, or use it yourself in session.</p>
          <div className="w-full bg-muted rounded-lg p-3 flex items-center gap-2">
            <span className="flex-1 text-sm truncate font-mono text-left">{shareUrl}</span>
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href={shareUrl!} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
