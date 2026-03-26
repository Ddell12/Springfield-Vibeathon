"use client";

import Link from "next/link";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";

interface EmptyStateAction {
  readonly label: string;
  readonly href?: string;
  readonly onClick?: () => void;
}

interface EmptyStateProps {
  readonly variant: "no-projects" | "no-shared" | "not-found" | "error";
  readonly title: string;
  readonly description: string;
  readonly primaryAction?: EmptyStateAction;
  readonly secondaryAction?: EmptyStateAction;
}

const VARIANT_CONFIG = {
  "no-projects": {
    icon: "widgets",
    accentIcon: "add",
    bgClass: "bg-primary/10",
    iconClass: "text-primary",
  },
  "no-shared": {
    icon: "group",
    accentIcon: null,
    bgClass: "bg-secondary/10",
    iconClass: "text-secondary",
  },
  "not-found": {
    icon: "description_off",
    accentIcon: null,
    bgClass: "bg-on-surface-variant/10",
    iconClass: "text-on-surface-variant",
  },
  error: {
    icon: "error",
    accentIcon: null,
    bgClass: "bg-error/10",
    iconClass: "text-error",
  },
} as const;

function ActionButton({
  action,
  variant,
  isError,
}: {
  action: EmptyStateAction;
  variant: "primary" | "secondary";
  isError: boolean;
}) {
  const isPrimary = variant === "primary";

  const className = cn(
    "min-h-[44px] px-6 py-2.5 rounded-lg font-medium transition-all active:scale-95",
    isPrimary && !isError &&
      "bg-gradient-to-br from-primary to-primary-container text-white hover:opacity-90",
    isPrimary && isError &&
      "bg-error text-white hover:bg-error/90",
    !isPrimary && !isError &&
      "text-primary hover:bg-surface-container-low",
    !isPrimary && isError &&
      "text-error hover:bg-error/10"
  );

  if (action.href) {
    return (
      <Button asChild variant="ghost" className={className}>
        <Link href={action.href}>{action.label}</Link>
      </Button>
    );
  }

  return (
    <Button variant="ghost" className={className} onClick={action.onClick}>
      {action.label}
    </Button>
  );
}

export function EmptyState({
  variant,
  title,
  description,
  primaryAction,
  secondaryAction,
}: EmptyStateProps) {
  const config = VARIANT_CONFIG[variant];
  const isError = variant === "error";

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      {/* Illustration circle */}
      <div
        className={cn(
          "flex h-[120px] w-[120px] items-center justify-center rounded-full",
          config.bgClass
        )}
      >
        {isError ? (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error-container">
            <MaterialIcon icon={config.icon} size="lg" className="text-on-error-container" />
          </div>
        ) : (
          <div className="relative flex items-center justify-center">
            <MaterialIcon icon={config.icon} size="xl" className={config.iconClass} />
            {config.accentIcon && (
              <div
                className={cn(
                  "absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full",
                  "bg-primary-container"
                )}
              >
                <MaterialIcon icon={config.accentIcon} className="text-sm text-white" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Title */}
      <h2 className="font-headline text-xl font-semibold text-foreground">
        {title}
      </h2>

      {/* Description */}
      <p className="max-w-sm text-sm text-muted">
        {description}
      </p>

      {/* Actions */}
      {(primaryAction || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
          {primaryAction && (
            <ActionButton
              action={primaryAction}
              variant="primary"
              isError={isError}
            />
          )}
          {secondaryAction && (
            <ActionButton
              action={secondaryAction}
              variant="secondary"
              isError={isError}
            />
          )}
        </div>
      )}
    </div>
  );
}
