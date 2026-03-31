import Link from "next/link";

import { MaterialIcon } from "@/shared/components/material-icon";
import { Badge } from "@/shared/components/ui/badge";

/**
 * "Close the Gap" hero for the Springfield Vibeathon landing page.
 * Communicates the mission: bridging the gap between therapists, parents,
 * and the tools they need — without code.
 */
export function CloseTheGapHero() {
  return (
    <section className="relative overflow-hidden bg-surface">
      {/* Decorative background blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-secondary/5 blur-3xl"
      />

      <div className="relative max-w-5xl mx-auto px-6 py-24 md:py-36 text-center">
        {/* Vibeathon badge */}
        <Badge className="bg-tertiary-fixed/40 text-on-tertiary-fixed uppercase tracking-widest gap-2 px-4 py-1.5 font-semibold mb-8">
          <MaterialIcon icon="circle" size="xs" />
          Springfield Vibeathon 2026 — Close the Gap Challenge
        </Badge>

        <h1 className="font-headline text-4xl sm:text-5xl lg:text-6xl font-normal text-on-surface leading-tight tracking-tight">
          Every child deserves a tool built{" "}
          <span className="text-primary">just for them.</span>
        </h1>

        <p className="mt-6 text-lg md:text-xl text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
          Bridges helps ABA therapists, speech therapists, and parents of autistic
          children build personalized interactive therapy apps — just by describing
          what they need. No coding. No waiting. No gap.
        </p>

        {/* Stats row */}
        <div className="mt-12 grid grid-cols-3 gap-6 max-w-lg mx-auto">
          {[
            { value: "5 min", label: "to build an app" },
            { value: "0 code", label: "required" },
            { value: "∞", label: "personalization" },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <span className="text-2xl font-normal text-primary">
                {value}
              </span>
              <span className="text-xs text-on-surface-variant uppercase tracking-wider">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/builder"
            className="w-full sm:w-auto bg-gradient-to-br from-primary to-primary-container text-white px-8 py-4 rounded-lg text-base font-bold inline-flex items-center justify-center gap-2 transition-all duration-300 hover:opacity-90 active:scale-95 min-h-[52px]"
          >
            Build Your First App
            <MaterialIcon icon="arrow_forward" size="sm" />
          </Link>
          <Link
            href="/library?tab=templates"
            className="w-full sm:w-auto bg-surface-container-low text-on-surface px-8 py-4 rounded-lg text-base font-bold inline-flex items-center justify-center hover:bg-surface-container-high transition-colors duration-300 min-h-[52px]"
          >
            Browse Templates
          </Link>
        </div>

        <p className="mt-6 text-xs text-on-surface-variant opacity-60">
          Free to use during the Vibeathon &middot; No account required
        </p>
      </div>
    </section>
  );
}
