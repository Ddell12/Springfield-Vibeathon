"use client";

import { useAction } from "convex/react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { extractErrorMessage } from "@/core/utils";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function usePublishing(sessionId: string | null, appName: string) {
  const publishApp = useAction(api.publish.publishApp);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const isPublishingRef = useRef(false);

  const handlePublish = useCallback(async () => {
    if (!sessionId || isPublishingRef.current) return;

    isPublishingRef.current = true;
    setIsPublishing(true);
    try {
      const result = await publishApp({
        sessionId: sessionId as Id<"sessions">,
        title: appName,
      });
      setPublishedUrl(result.deploymentUrl);
      setPublishModalOpen(true);
    } catch (err) {
      console.error("Publish failed:", err);
      toast.error(extractErrorMessage(err));
    } finally {
      isPublishingRef.current = false;
      setIsPublishing(false);
    }
  }, [sessionId, appName, publishApp]);

  return {
    isPublishing,
    publishedUrl,
    publishModalOpen,
    setPublishModalOpen,
    handlePublish,
    setPublishedUrl,
  };
}
