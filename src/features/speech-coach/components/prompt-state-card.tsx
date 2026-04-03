import { cn } from "@/core/utils";

type PromptState = "listen" | "your_turn" | "try_again" | "nice_job";

const STATE_CONFIG: Record<
  PromptState,
  { emoji: string; label: string; bg: string; text: string }
> = {
  listen: {
    emoji: "👂",
    label: "Listen carefully",
    bg: "bg-info-container",
    text: "text-on-info-container",
  },
  your_turn: {
    emoji: "⭐",
    label: "Your turn!",
    bg: "bg-primary/10",
    text: "text-primary",
  },
  try_again: {
    emoji: "🤚",
    label: "Try again",
    bg: "bg-caution-container",
    text: "text-on-caution-container",
  },
  nice_job: {
    emoji: "✓",
    label: "Nice job!",
    bg: "bg-success-container",
    text: "text-on-success-container",
  },
};

type Props = {
  state: PromptState;
  reducedMotion: boolean;
};

export function PromptStateCard({ state, reducedMotion }: Props) {
  const config = STATE_CONFIG[state];
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl px-6 py-4",
        config.bg,
        config.text,
        !reducedMotion && "transition-colors duration-300"
      )}
    >
      <span className="text-2xl" aria-hidden="true">
        {config.emoji}
      </span>
      <span className="font-headline text-xl font-semibold">{config.label}</span>
    </div>
  );
}
