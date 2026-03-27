import { useRouter } from "next/navigation";

import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";

interface ContinueCardProps {
  sessionId: string;
  title: string;
  onDismiss: () => void;
}

export function ContinueCard({ sessionId, title, onDismiss }: ContinueCardProps) {
  const router = useRouter();

  return (
    <div className="flex w-full max-w-2xl items-center gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-3 shadow-sm">
      <MaterialIcon icon="history" size="sm" className="text-primary" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-on-surface">
          Continue working on <span className="font-semibold">{title}</span>
        </p>
      </div>
      <button
        onClick={() => router.push(`/builder/${sessionId}`)}
        className="shrink-0 rounded-lg bg-primary-gradient px-4 py-1.5 text-sm font-semibold text-white transition-all hover:shadow-md active:scale-95"
      >
        Continue
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        <MaterialIcon icon="close" size="xs" />
      </Button>
    </div>
  );
}
