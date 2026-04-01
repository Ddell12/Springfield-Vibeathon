import { MessageSquare, Wand2, Eye, Globe, Bot, Layout, Volume2, Mic, Shield, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/shared/components/ui/button";

export const metadata: Metadata = {
  title: "Platform — Vocali",
  description:
    "Vocali uses Claude to generate complete, interactive therapy apps from plain-language descriptions. No code required. No templates to fight with.",
};

const PIPELINE_STEPS = [
  {
    number: "01",
    icon: MessageSquare,
    title: "Describe",
    description: "Tell Vocali what you need in plain language.",
  },
  {
    number: "02",
    icon: Wand2,
    title: "Generate",
    description: "Claude writes a complete React app, purpose-built for therapy.",
  },
  {
    number: "03",
    icon: Eye,
    title: "Preview",
    description: "Test it live in a sandboxed, accessible preview before anyone else sees it.",
  },
  {
    number: "04",
    icon: Globe,
    title: "Publish",
    description: "Share a permanent link with families, co-therapists, or students.",
  },
];

const CAPABILITIES = [
  {
    icon: Bot,
    title: "AI Code Generation",
    description: "Claude Sonnet generates full React + Tailwind apps from your description.",
  },
  {
    icon: Layout,
    title: "Therapy-Aware Templates",
    description: "40+ shadcn/ui components pre-wired for therapy use cases.",
  },
  {
    icon: Volume2,
    title: "Text-to-Speech",
    description: "ElevenLabs child-friendly voices built into every generated app.",
  },
  {
    icon: Mic,
    title: "Speech-to-Text",
    description: "ElevenLabs Scribe for voice interaction in apps that need it.",
  },
  {
    icon: Shield,
    title: "Sandboxed Preview",
    description: "Every app runs in an isolated iframe — safe, accessible, shareable.",
  },
  {
    icon: ExternalLink,
    title: "Vercel Publish",
    description: "One-click permanent deployment with a custom shareable URL.",
  },
];

export default function PlatformPage() {
  return (
    <main className="mx-auto w-full max-w-[1180px] px-6 py-20 lg:px-10">
      {/* Hero */}
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-headline text-5xl leading-[1.15] tracking-tight text-on-surface">
          From description to working app — in seconds.
        </h1>
        <p className="mt-6 text-lg leading-7 text-on-surface-variant">
          Vocali uses Claude to generate complete, interactive therapy apps from plain-language
          descriptions. No code required. No templates to fight with.
        </p>
      </div>

      {/* 4-step pipeline */}
      <div className="mt-20">
        <h2 className="font-headline text-center text-3xl text-on-surface">How it works</h2>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE_STEPS.map(({ number, icon: Icon, title, description }) => (
            <div key={title} className="rounded-3xl bg-surface p-8">
              <span className="font-mono text-xs tracking-widest text-on-surface-variant">
                {number}
              </span>
              <div className="mt-3 flex size-12 items-center justify-center rounded-2xl bg-accent">
                <Icon className="size-6 text-primary" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-on-surface">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Capability grid */}
      <div className="mt-20">
        <h2 className="font-headline text-center text-3xl text-on-surface">
          Built for therapy, from the ground up
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map(({ icon: Icon, title, description }) => (
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

      {/* Trust callout */}
      <div className="mt-14 rounded-3xl bg-accent px-8 py-10 text-center">
        <p className="text-base leading-7 text-on-surface">
          Every app is sandboxed, accessible, and runs entirely in your browser —
          no installs, no downloads, no data leaves your session.
        </p>
      </div>

      {/* CTA */}
      <div className="mt-14 text-center">
        <Button asChild variant="gradient" className="rounded-xl px-8 font-semibold">
          <Link href="/builder?new=1">Try the builder</Link>
        </Button>
      </div>
    </main>
  );
}
