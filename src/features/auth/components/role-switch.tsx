import Link from "next/link";

import { cn } from "@/core/utils";
import type { AuthRole } from "@/features/auth/lib/auth-content";

export function RoleSwitch({
  role,
  className,
}: {
  role: AuthRole;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full bg-surface px-1 py-1 shadow-[0_12px_30px_rgba(26,25,23,0.08)] ring-1 ring-border/70",
        className
      )}
    >
      <Link
        href="/sign-in?role=slp"
        className={cn(
          "rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300",
          role === "slp"
            ? "bg-primary text-white"
            : "text-on-surface-variant hover:text-on-surface"
        )}
      >
        Therapist
      </Link>
      <Link
        href="/sign-in?role=caregiver"
        className={cn(
          "rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300",
          role === "caregiver"
            ? "bg-primary text-white"
            : "text-on-surface-variant hover:text-on-surface"
        )}
      >
        Caregiver
      </Link>
    </div>
  );
}
