"use client";

import { cn } from "@/core/utils";

export function AnimatedGradient({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "absolute inset-0 -z-10 h-full w-full overflow-hidden pointer-events-none bg-background",
        className
      )}
    >
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background: `
            radial-gradient(circle at 10% 90%, var(--color-primary-container) 0%, transparent 60%),
            radial-gradient(circle at 90% 90%, var(--color-secondary-container) 0%, transparent 60%),
            radial-gradient(circle at 50% 80%, var(--color-primary) 0%, transparent 70%),
            radial-gradient(circle at 20% 30%, var(--color-on-primary-container) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, var(--color-secondary-fixed) 0%, transparent 50%)
          `,
        }}
      />
      <div className="absolute inset-0 backdrop-blur-[100px]" />
    </div>
  );
}
