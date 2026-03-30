"use client";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";

interface DemoToolCardProps {
  title: string;
  description: string;
  categoryLabel: string;
  icon: string;
  gradient: string;
  disabled?: boolean;
  onTryIt: () => void;
}

export function DemoToolCard({
  title,
  description,
  categoryLabel,
  icon,
  gradient,
  disabled,
  onTryIt,
}: DemoToolCardProps) {
  return (
    <div className="group relative bg-surface-container rounded-2xl overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:shadow-lg hover:-translate-y-1">
      {/* Gradient thumbnail area */}
      <div
        className={cn(
          "h-40 bg-gradient-to-br flex items-center justify-center relative",
          gradient
        )}
      >
        <MaterialIcon
          icon={icon}
          className="text-5xl text-white/80"
        />
        {disabled && (
          <span className="absolute top-3 right-3 px-2 py-0.5 bg-surface/90 text-on-surface text-xs font-bold rounded-full">
            Coming Soon
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col gap-3">
        <div>
          <Badge variant="secondary" className="bg-primary/10 text-primary font-bold mb-2">
            {categoryLabel}
          </Badge>
          <h3 className="font-body font-bold text-lg text-on-surface">
            {title}
          </h3>
          <p className="text-on-surface-variant text-sm mt-1 line-clamp-2">
            {description}
          </p>
        </div>
        <Button
          onClick={onTryIt}
          disabled={disabled}
          className="w-full bg-primary-gradient text-on-primary font-semibold hover:opacity-90 transition-all duration-300 active:scale-95"
        >
          Try It
        </Button>
      </div>
    </div>
  );
}
