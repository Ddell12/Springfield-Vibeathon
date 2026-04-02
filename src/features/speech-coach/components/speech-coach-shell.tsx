"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ROUTES } from "@/core/routes";
import { cn } from "@/core/utils";

import { SPEECH_COACH_SECTIONS } from "./speech-coach-sections";

interface SpeechCoachShellProps {
  children: React.ReactNode;
}

function isSectionActive(sectionHref: string, pathname: string): boolean {
  if (sectionHref === ROUTES.SPEECH_COACH) {
    // Sessions is at /speech-coach exactly — don't activate on sub-routes
    return pathname === ROUTES.SPEECH_COACH;
  }
  return pathname === sectionHref || pathname.startsWith(sectionHref + "/");
}

export function SpeechCoachShell({ children }: SpeechCoachShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      <nav
        aria-label="Speech Coach sections"
        className="flex gap-1 border-b border-outline-variant/30 bg-surface px-4"
      >
        {SPEECH_COACH_SECTIONS.map((section) => {
          const isActive = isSectionActive(section.href, pathname);
          return (
            <Link
              key={section.id}
              href={section.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "px-3 py-3 text-sm font-medium transition-colors duration-200 border-b-2 -mb-px",
                isActive
                  ? "border-primary text-on-surface"
                  : "border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant/50",
              )}
            >
              {section.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
