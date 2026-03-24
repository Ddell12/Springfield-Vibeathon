import { cn } from "@/core/utils";

const badgeStyles: Record<string, string> = {
  "communication-board": "bg-primary-container text-on-primary-fixed-variant",
  "token-board": "bg-secondary-container/30 text-on-secondary-container",
  "visual-schedule": "bg-tertiary-container text-on-tertiary-container",
  "choice-board": "bg-primary-fixed/30 text-primary",
  "first-then-board": "bg-tertiary-fixed text-on-tertiary-fixed",
};

const labelMap: Record<string, string> = {
  "communication-board": "Communication Board",
  "token-board": "Token Board",
  "visual-schedule": "Visual Schedule",
  "choice-board": "Choice Board",
  "first-then-board": "First-Then Board",
};

export function TypeBadge({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase",
        badgeStyles[type] ?? "bg-surface-container-highest text-on-surface-variant",
        className,
      )}
    >
      {labelMap[type] ?? type}
    </span>
  );
}
