import { cn } from "@/lib/utils";

interface PromptCardProps {
  icon: string;
  title: string;
  instruction: string;
  highlighted?: boolean;
  className?: string;
}

export function PromptCard({
  icon,
  title,
  instruction,
  highlighted = false,
  className,
}: PromptCardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] p-5 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        "bg-[var(--color-surface-raised)] shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
        highlighted && "ring-2 ring-[var(--color-primary)] bg-[var(--color-primary-bg)] shadow-[0_4px_16px_rgba(0,89,92,0.15)]",
        className
      )}
    >
      <div className="flex items-start gap-4">
        <span
          className={cn(
            "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-2xl",
            highlighted
              ? "bg-[var(--color-primary)] text-white"
              : "bg-[var(--color-primary-bg)]"
          )}
          role="img"
          aria-hidden
        >
          {icon}
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-[var(--font-heading)] text-lg font-bold text-[var(--color-text)]">
            {title}
          </h3>
          <p className="text-[var(--color-text-muted)] text-sm leading-relaxed">
            {instruction}
          </p>
        </div>
      </div>
    </div>
  );
}
