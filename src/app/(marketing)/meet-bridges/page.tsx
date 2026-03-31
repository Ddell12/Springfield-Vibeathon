import { GraduationCap, Heart, ClipboardList, Grid2x2, Calendar, BarChart2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/shared/components/ui/button";

export const metadata: Metadata = {
  title: "Meet Bridges — AI Therapy App Builder",
  description:
    "Bridges is an AI-powered app builder made for speech therapists, ABA therapists, and parents of autistic children. Describe the therapy tool you need — Bridges builds it in seconds.",
};

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

export default function MeetBridgesPage() {
  return (
    <main className="mx-auto w-full max-w-[1180px] px-6 py-20 lg:px-10">
      {/* Hero */}
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-headline text-5xl leading-[1.15] tracking-tight text-on-surface">
          Every child deserves a bridge to communication.
        </h1>
        <p className="mt-6 text-lg leading-7 text-on-surface-variant">
          Bridges is an AI-powered app builder made for speech therapists, ABA therapists, and
          parents of autistic children. Describe the therapy tool you need in plain language —
          Bridges builds it in seconds.
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
      <div className="mt-20">
        <h2 className="font-headline text-center text-3xl text-on-surface">Who it&apos;s for</h2>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {ROLES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-3xl bg-surface p-8">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-accent">
                <Icon className="size-6 text-primary" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-on-surface">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* What you can build */}
      <div className="mt-20">
        <h2 className="font-headline text-center text-3xl text-on-surface">
          What you can build
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {APP_TYPES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-3xl bg-surface p-8">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-accent">
                <Icon className="size-6 text-primary" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-on-surface">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA strip */}
      <div className="mt-20 rounded-3xl bg-surface px-8 py-12 text-center">
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
