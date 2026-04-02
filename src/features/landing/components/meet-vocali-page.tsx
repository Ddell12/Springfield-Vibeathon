import { BarChart2, Calendar, ClipboardList, GraduationCap, Grid2x2, Heart } from "lucide-react";
import Link from "next/link";

import { Button } from "@/shared/components/ui/button";

const ROLES = [
  {
    icon: GraduationCap,
    title: "Speech-Language Pathologists",
    description:
      "Create custom AAC boards, exercises, and data collection tools without touching code.",
  },
  {
    icon: Heart,
    title: "Caregivers & Parents",
    description:
      "Build home practice apps, visual schedules, and communication boards tailored to your child.",
  },
  {
    icon: ClipboardList,
    title: "ABA Therapists",
    description:
      "Generate behavior tracking apps, reinforcement systems, and visual timers for every goal.",
  },
];

const APP_TYPES = [
  {
    icon: Grid2x2,
    title: "AAC Communication Boards",
    description: "Core vocabulary, Fitzgerald colors, and motor planning built in.",
  },
  {
    icon: Calendar,
    title: "Visual Schedules",
    description: "Step-by-step routines with images and audio cues.",
  },
  {
    icon: BarChart2,
    title: "Behavior Trackers",
    description: "Frequency data, interval recording, and ABC logging.",
  },
];

export function MeetVocaliPage() {
  return (
    <main className="mx-auto w-full max-w-[1180px] px-6 py-20 lg:px-10">
      {/* Hero */}
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-headline text-5xl leading-[1.15] tracking-tight text-on-surface">
          Every child deserves a bridge to communication.
        </h1>
        <p className="mt-6 text-lg leading-7 text-on-surface-variant">
          Vocali is an AI-powered app builder made for speech therapists, ABA therapists, and
          parents of autistic children. Describe the therapy tool you need in plain language —
          Vocali builds it in seconds.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="gradient" className="rounded-xl px-6 font-semibold">
            <Link href="/sign-up">Start building free</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl px-6">
            <Link href="/explore">See examples</Link>
          </Button>
        </div>
      </div>

      {/* Who it's for */}
      <section className="mt-20 rounded-xl bg-surface px-6 py-8 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-on-surface-variant">
              Who it&apos;s for
            </p>
            <h2 className="mt-3 font-headline text-3xl text-on-surface">
              Built for the people carrying therapy forward every day.
            </h2>
          </div>
          <div className="grid gap-4">
            {ROLES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="grid gap-3 rounded-lg bg-surface-container-low px-5 py-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
                <Icon className="mt-1 size-5 text-primary" />
                <div>
                  <h3 className="text-base font-semibold text-on-surface">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-on-surface-variant">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What you can build */}
      <section className="mt-20">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-on-surface-variant">
            What you can build
          </p>
          <h2 className="mt-3 font-headline text-3xl text-on-surface">
            Start with the therapy app you needed yesterday.
          </h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {APP_TYPES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-lg bg-surface-container-low px-5 py-6">
              <Icon className="size-5 text-primary" />
              <h3 className="mt-4 text-base font-semibold text-on-surface">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA strip */}
      <div className="mt-20 rounded-xl bg-surface px-8 py-12 text-center">
        <h2 className="font-headline text-2xl text-on-surface">
          Ready to build your first app?
        </h2>
        <Button asChild variant="gradient" className="mt-6 rounded-xl px-8 font-semibold">
          <Link href="/sign-up">Get started free</Link>
        </Button>
      </div>
    </main>
  );
}
