"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { getSessionStatusLabel } from "../lib/session-analysis";
import { ProgressCard } from "./progress-card";

const STATUS_STYLES = {
  configuring: "bg-muted text-muted-foreground",
  active: "bg-info-container text-on-info-container",
  transcript_ready: "bg-caution-container text-on-caution-container",
  analyzing: "bg-caution-container text-on-caution-container",
  analyzed: "bg-success-container text-on-success-container",
  review_failed: "bg-error-container text-on-error-container",
  failed: "bg-error-container text-on-error-container",
  // legacy compat
  completed: "bg-success-container text-on-success-container",
};

function formatDuration(startedAt?: number, endedAt?: number): string {
  if (!startedAt || !endedAt) return "\u2014";
  const seconds = Math.round((endedAt - startedAt) / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return "\u2014";
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type Props =
  | { mode?: "clinical"; patientId: Id<"patients"> }
  | { mode: "standalone" };

export function SessionHistory(props: Props) {
  const clinicalSessions = useQuery(
    api.speechCoach.getSessionHistory,
    props.mode === "standalone" ? "skip" : { patientId: props.patientId }
  );
  const standaloneSessions = useQuery(
    api.speechCoach.getStandaloneHistory,
    props.mode === "standalone" ? {} : "skip"
  );
  const sessions = props.mode === "standalone" ? standaloneSessions : clinicalSessions;
  const [expandedId, setExpandedId] = useState<Id<"speechCoachSessions"> | null>(null);

  if (!sessions) {
    return <div className="p-6 text-muted-foreground">Loading sessions...</div>;
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-lg font-medium text-foreground">No sessions yet</p>
        <p className="text-sm text-muted-foreground">
          Your session history will appear here after your first coaching session.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-6">
      {sessions.map((session) => (
        <div key={session._id} className="rounded-xl bg-muted/20">
          <button
            type="button"
            onClick={() => setExpandedId(expandedId === session._id ? null : session._id)}
            className="flex w-full items-center justify-between gap-4 p-4 text-left"
          >
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground">
                {formatDate(session.startedAt ?? session._creationTime)}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {session.config.targetSounds.map((sound) => (
                  <span key={sound} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {sound}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {formatDuration(session.startedAt, session.endedAt)}
              </span>
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[session.status as keyof typeof STATUS_STYLES])}>
                {getSessionStatusLabel(session.status)}
              </span>
            </div>
          </button>

          {expandedId === session._id && (
            <ExpandedDetail sessionId={session._id} />
          )}
        </div>
      ))}
    </div>
  );
}

function ExpandedDetail({ sessionId }: { sessionId: Id<"speechCoachSessions"> }) {
  const detail = useQuery(api.speechCoach.getSessionDetail, { sessionId });
  const getTranscriptText = useAction(api.speechCoachActions.getTranscriptText);
  const retryReview = useMutation(api.speechCoach.retryReview);
  const [isRetrying, setIsRetrying] = useState(false);
  const [transcriptText, setTranscriptText] = useState<string | null>(null);
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadTranscript() {
      if (!detail?.session?.transcriptStorageId) {
        setTranscriptText(null);
        return;
      }

      setIsTranscriptLoading(true);
      try {
        const result = await getTranscriptText({ sessionId });
        if (!cancelled) {
          setTranscriptText(result.transcript);
        }
      } catch (error) {
        console.error("[SessionHistory] Failed to load transcript:", error);
        if (!cancelled) {
          setTranscriptText(null);
        }
      } finally {
        if (!cancelled) {
          setIsTranscriptLoading(false);
        }
      }
    }

    void loadTranscript();

    return () => {
      cancelled = true;
    };
  }, [detail?.session?.transcriptStorageId, getTranscriptText, sessionId]);

  async function handleRetry() {
    setIsRetrying(true);
    try {
      await retryReview({ sessionId });
    } catch (err) {
      console.error("[SessionHistory] Failed to retry review:", err);
      toast.error("Could not retry review. Please try again.");
    } finally {
      setIsRetrying(false);
    }
  }

  if (!detail) return <div className="px-4 pb-4 text-sm text-muted-foreground">Loading...</div>;
  const snapshot = detail.session?.config.runtimeSnapshot;
  const hasStoredTranscript = Boolean(detail.session?.transcriptStorageId);
  const transcriptPanel = hasStoredTranscript ? (
    <TranscriptPanel
      transcriptText={transcriptText}
      isLoading={isTranscriptLoading}
    />
  ) : null;

  if (!detail.progress) {
    if (detail.session?.status === "review_failed") {
      return (
        <div className="px-4 pb-4">
          <p className="text-sm text-foreground">Transcript available while review is retried.</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            disabled={isRetrying}
            onClick={handleRetry}
          >
            {isRetrying ? "Retrying…" : "Retry review"}
          </Button>
          {snapshot ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Template v{snapshot.templateVersion} · {snapshot.voiceKey}
            </p>
          ) : null}
          {transcriptPanel ? <div className="mt-3">{transcriptPanel}</div> : null}
        </div>
      );
    }

    if (detail.session?.status === "analyzing") {
      return (
        <div className="px-4 pb-4 text-sm text-muted-foreground">
          <p>
            {hasStoredTranscript
              ? "Transcript saved. AI review is in progress."
              : "Preparing transcript and review."}
          </p>
          {snapshot ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Template v{snapshot.templateVersion} · {snapshot.voiceKey}
            </p>
          ) : null}
          {transcriptPanel ? <div className="mt-3">{transcriptPanel}</div> : null}
        </div>
      );
    }

    return (
      <div className="px-4 pb-4 text-sm text-muted-foreground">
        {detail.session?.status === "failed"
          ? detail.session.errorMessage ?? "Session did not complete."
          : "Session is still being reviewed."}
        {snapshot ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Template v{snapshot.templateVersion} · {snapshot.voiceKey}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="px-4 pb-4">
      {snapshot ? (
        <p className="mb-2 text-xs text-muted-foreground">
          Template v{snapshot.templateVersion} · {snapshot.voiceKey}
        </p>
      ) : null}
      <ProgressCard progress={detail.progress} />
      {transcriptPanel ? <div className="mt-4">{transcriptPanel}</div> : null}
    </div>
  );
}

function TranscriptPanel({
  transcriptText,
  isLoading,
}: {
  transcriptText: string | null;
  isLoading: boolean;
}) {
  return (
    <div className="rounded-xl bg-muted/35 p-3">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        Raw transcript
      </p>
      <div className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg bg-background/80 p-3 text-sm text-foreground">
        {isLoading ? "Loading transcript…" : transcriptText ?? "Transcript is being prepared."}
      </div>
    </div>
  );
}
