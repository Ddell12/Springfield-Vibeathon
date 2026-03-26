import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-[var(--radius-lg)] p-5 transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
  {
    variants: {
      variant: {
        elevated:
          "bg-[var(--color-surface-raised)] shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
        flat: "bg-[var(--color-surface)]",
        interactive:
          "bg-[var(--color-surface-raised)] shadow-[0_2px_8px_rgba(0,0,0,0.06)] cursor-pointer hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 active:scale-[0.98] select-none",
      },
    },
    defaultVariants: { variant: "elevated" },
  }
);

interface TherapyCardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  children: ReactNode;
}

export function TherapyCard({
  variant,
  className,
  children,
  ...props
}: TherapyCardProps) {
  return (
    <div className={cn(cardVariants({ variant }), className)} {...props}>
      {children}
    </div>
  );
}
