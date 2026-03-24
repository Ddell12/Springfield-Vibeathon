import { CheckCircle2, MousePointer, Pencil, Share2 } from "lucide-react";

import { cn } from "@/core/utils";
import type { FragmentResult } from "../lib/schema";

type CompletionMessageProps = {
  fragment: FragmentResult;
};

const tips = [
  {
    icon: Pencil,
    label: "Customize",
    description:
      "Tell me what to change — colors, labels, layout, anything.",
  },
  {
    icon: Share2,
    label: "Share",
    description:
      "Tap the Share button to get a link that works on any phone or tablet.",
  },
  {
    icon: MousePointer,
    label: "Try it",
    description:
      "Interact with your tool in the preview — tap, drag, explore.",
  },
];

export function CompletionMessage({ fragment }: CompletionMessageProps) {
  return (
    <div
      className={cn(
        "w-full rounded-2xl bg-surface-container-lowest p-5 sanctuary-shadow mb-6"
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <CheckCircle2
          className="mt-0.5 shrink-0 text-primary"
          size={22}
          aria-hidden="true"
        />
        <div>
          <h3 className="font-headline text-base font-semibold text-on-surface leading-snug">
            Your {fragment.title} is ready!
          </h3>
          <p className="mt-1 text-sm text-on-surface-variant leading-relaxed">
            {fragment.description}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-surface-container-high mx-0 my-3" />

      {/* What's next section */}
      <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-3">
        What&apos;s next?
      </p>
      <ul className="flex flex-col gap-3">
        {tips.map(({ icon: Icon, label, description }) => (
          <li key={label} className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Icon size={14} className="text-primary" aria-hidden="true" />
            </div>
            <div>
              <span className="text-sm font-semibold text-on-surface">
                {label}
              </span>
              <span className="text-sm text-on-surface-variant">
                {" "}
                — {description}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
