"use client";

import { Grid2x2, Calendar, BarChart2, BookOpen, Home, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";

type Role = "slp" | "caregiver" | "aba";

const ROLES: { id: Role; label: string }[] = [
  { id: "slp", label: "Speech-Language Pathologist" },
  { id: "caregiver", label: "Caregiver / Parent" },
  { id: "aba", label: "ABA Therapist" },
];

const CONTENT: Record<
  Role,
  {
    pain: string;
    solution: string;
    apps: { icon: React.ElementType; label: string }[];
    quote: string;
    attribution: string;
    ctaLabel: string;
    ctaHref: string;
  }
> = {
  slp: {
    pain: "Your caseload is full. Creating custom materials takes hours you don't have.",
    solution:
      "Describe the exercise, the AAC layout, or the data sheet — Vocali builds it in under a minute. Share it instantly with families and co-therapists.",
    apps: [
      { icon: Grid2x2, label: "AAC core boards" },
      { icon: BookOpen, label: "Articulation drills" },
      { icon: BarChart2, label: "Session data collection sheets" },
    ],
    quote:
      "I built a custom AAC board for a new student in 3 minutes. It would have taken me an afternoon before.",
    attribution: "Speech-Language Pathologist",
    ctaLabel: "Sign up as a therapist",
    ctaHref: "/sign-in?role=slp",
  },
  caregiver: {
    pain: "Home practice is hard when your child's tools only exist at the clinic.",
    solution:
      "Build apps that match exactly what your child is working on, and use them on any device — no app store required.",
    apps: [
      { icon: Calendar, label: "Visual morning routines" },
      { icon: Grid2x2, label: "Home vocabulary boards" },
      { icon: Star, label: "Reward / token systems" },
    ],
    quote: "My son uses his schedule app every morning. It's the first thing that actually stuck.",
    attribution: "Parent of a child with autism",
    ctaLabel: "Sign up as a caregiver",
    ctaHref: "/sign-in?role=caregiver",
  },
  aba: {
    pain: "Tracking data on paper during a session breaks your focus on the child.",
    solution:
      "Generate a behavior tracking app in minutes — frequency, interval, ABC format. Tap to record, no paper needed.",
    apps: [
      { icon: BarChart2, label: "Frequency counters" },
      { icon: Home, label: "ABC data sheets" },
      { icon: Grid2x2, label: "Visual reinforcement boards" },
    ],
    quote: "Now I track trials on my phone without looking away from my client.",
    attribution: "Board-Certified Behavior Analyst",
    ctaLabel: "Sign up as a therapist",
    ctaHref: "/sign-in?role=slp",
  },
};

export function RoleTabs() {
  const [active, setActive] = useState<Role>("slp");
  const content = CONTENT[active];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex flex-wrap gap-2">
        {ROLES.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              active === id
                ? "bg-primary text-white"
                : "bg-surface text-on-surface-variant hover:text-on-surface"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-8 rounded-3xl bg-surface p-8 sm:p-10">
        <h2 className="font-headline text-3xl text-on-surface">{content.pain}</h2>
        <p className="mt-4 text-base leading-7 text-on-surface-variant">{content.solution}</p>

        <ul className="mt-8 space-y-3">
          {content.apps.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 text-sm text-on-surface">
              <div className="flex size-8 items-center justify-center rounded-lg bg-accent">
                <Icon className="size-4 text-primary" />
              </div>
              {label}
            </li>
          ))}
        </ul>

        <blockquote className="mt-8 border-l-2 border-primary pl-4">
          <p className="text-sm italic leading-6 text-on-surface-variant">
            &ldquo;{content.quote}&rdquo;
          </p>
          <footer className="mt-2 text-xs text-on-surface-variant">— {content.attribution}</footer>
        </blockquote>

        <Button asChild variant="gradient" className="mt-8 rounded-xl font-semibold">
          <Link href={content.ctaHref}>{content.ctaLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
