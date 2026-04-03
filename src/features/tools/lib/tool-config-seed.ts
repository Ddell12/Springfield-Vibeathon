import type { Id } from "@convex/_generated/dataModel";

interface AppInstance {
  _id: Id<"app_instances">;
  patientId?: Id<"patients">;
  templateType: string;
  configJson: string;
  shareToken?: string;
  status: "draft" | "published" | "archived";
}

export interface SeededState {
  patientId: Id<"patients"> | null;
  templateType: string;
  config: unknown;
  instanceId: Id<"app_instances">;
  publishedShareToken: string | null;
}

/**
 * Parse an existing app_instances document into a builder state seed.
 * Uses a zero-delay timer to defer state updates until after the first
 * render cycle (avoids React batching issues with useQuery initialization).
 */
export function seedStateFromInstance(
  instance: AppInstance,
  onSeed: (state: SeededState) => void
): () => void {
  const timer = setTimeout(() => {
    onSeed({
      patientId: instance.patientId ?? null,
      templateType: instance.templateType,
      config: JSON.parse(instance.configJson),
      instanceId: instance._id,
      publishedShareToken: instance.shareToken ?? null,
    });
  }, 0);
  return () => clearTimeout(timer);
}
