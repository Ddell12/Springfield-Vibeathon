import {
  ArrowUpDown,
  Gift,
  Grid3X3,
  ImagePlus,
  ListPlus,
  Maximize2,
  Palette,
  Plus,
  Sparkles,
  Star,
  Timer,
  Volume2,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/core/utils";
import type { FragmentResult } from "../lib/schema";

type ChipDef = {
  label: string;
  icon: LucideIcon;
  prompt: string;
};

const CHIPS_BY_TYPE: Record<string, ChipDef[]> = {
  "communication-board": [
    {
      label: "Add More Cards",
      icon: Plus,
      prompt: "Add more picture cards for foods my child likes",
    },
    {
      label: "Enable Speech",
      icon: Volume2,
      prompt: "Turn on text-to-speech so the board speaks out loud",
    },
    {
      label: "Change Grid Size",
      icon: Grid3X3,
      prompt: "Make it a 4-column grid with bigger pictures",
    },
  ],
  "token-board": [
    {
      label: "Change Rewards",
      icon: Gift,
      prompt: "Change the reward options to iPad, playground, and bubbles",
    },
    {
      label: "More Tokens",
      icon: Star,
      prompt: "Change to 10 tokens instead of 5",
    },
    {
      label: "Add Timer",
      icon: Timer,
      prompt: "Add a countdown timer for earning each token",
    },
  ],
  "visual-schedule": [
    {
      label: "Add Steps",
      icon: ListPlus,
      prompt: "Add steps for brushing teeth and getting dressed",
    },
    {
      label: "Reorder Steps",
      icon: ArrowUpDown,
      prompt: "Move breakfast before getting dressed",
    },
    {
      label: "Add Images",
      icon: ImagePlus,
      prompt: "Add picture icons for each step",
    },
  ],
  default: [
    {
      label: "Make It Bigger",
      icon: Maximize2,
      prompt: "Make all tap targets and text larger for small hands",
    },
    {
      label: "Change Colors",
      icon: Palette,
      prompt: "Use calming blue and green colors instead",
    },
    {
      label: "Add Animation",
      icon: Sparkles,
      prompt: "Add gentle animations when completing steps",
    },
  ],
};

function detectToolType(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();

  if (
    text.includes("communication") ||
    text.includes("picture card") ||
    text.includes("aac") ||
    text.includes("pecs")
  ) {
    return "communication-board";
  }

  if (
    text.includes("token") ||
    text.includes("reward") ||
    text.includes("star chart") ||
    text.includes("sticker chart")
  ) {
    return "token-board";
  }

  if (
    text.includes("schedule") ||
    text.includes("routine") ||
    text.includes("visual schedule") ||
    text.includes("first then")
  ) {
    return "visual-schedule";
  }

  return "default";
}

type SuggestedActionsProps = {
  fragment: FragmentResult;
  onAction: (prompt: string) => void;
};

export function SuggestedActions({ fragment, onAction }: SuggestedActionsProps) {
  const toolType = detectToolType(fragment.title, fragment.description);
  const chips = CHIPS_BY_TYPE[toolType] ?? CHIPS_BY_TYPE["default"];

  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-2 pt-1 scrollbar-none">
      {chips.map(({ label, icon: Icon, prompt }) => (
        <button
          key={label}
          onClick={() => onAction(prompt)}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5",
            "bg-surface-container-low hover:bg-surface-container-high",
            "text-sm font-medium text-on-surface",
            "transition-colors duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          )}
          type="button"
        >
          <Icon size={14} className="text-primary" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}
