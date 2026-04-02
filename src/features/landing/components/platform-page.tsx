import { Bot, ExternalLink, Eye, Globe, Layout, MessageSquare, Mic, Shield, Volume2, Wand2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/shared/components/ui/button";

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

export function PlatformPage() {
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
      <section className="mt-20 rounded-xl bg-surface px-6 py-8 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-on-surface-variant">
              How it works
            </p>
            <h2 className="mt-3 font-headline text-3xl text-on-surface">
              A builder flow that stays readable from prompt to publish.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {PIPELINE_STEPS.map(({ number, icon: Icon, title, description }) => (
              <div key={title} className="rounded-lg bg-surface-container-low px-5 py-5">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-on-surface-variant">
                    {number}
                  </span>
                  <Icon className="size-4 text-primary" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-on-surface">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capability grid */}
      <section className="mt-20">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-on-surface-variant">
            Capability set
          </p>
          <h2 className="mt-3 font-headline text-3xl text-on-surface">
            Purpose-built for therapy sessions, not a generic app studio.
          </h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {CAPABILITIES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-lg bg-surface-container-low px-5 py-6">
              <Icon className="size-5 text-primary" />
              <h3 className="mt-4 text-base font-semibold text-on-surface">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust callout */}
      <div className="mt-14 rounded-xl bg-surface-container-low px-8 py-10 text-center">
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
