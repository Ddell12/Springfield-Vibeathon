"use client";

import { useState } from "react";
import Link from "next/link";
import { MaterialIcon } from "@/shared/components/material-icon";
import { ToolCard } from "@/shared/components/tool-card";
import { cn } from "@/core/utils";

type Category = "all" | "communication" | "rewards" | "routines";

const categories: { value: Category; label: string }[] = [
  { value: "all", label: "All" },
  { value: "communication", label: "Communication" },
  { value: "rewards", label: "Rewards" },
  { value: "routines", label: "Routines" },
];

const mockTemplates = [
  {
    title: "Feelings Board",
    toolType: "communication-board",
    description:
      "Helps children identify and express complex emotions using visual cues and relatable character icons.",
    category: "communication" as Category,
  },
  {
    title: "Basic Needs Board",
    toolType: "communication-board",
    description:
      "A simplified interface for non-verbal communication of immediate requirements like food, water, and rest.",
    category: "communication" as Category,
  },
  {
    title: "5-Star Reward Chart",
    toolType: "token-board",
    description:
      "Encourages positive behavior reinforcement through incremental goals and visual achievement milestones.",
    category: "rewards" as Category,
  },
  {
    title: "Sticker Collection",
    toolType: "token-board",
    description:
      "A gamified approach to task completion where children earn digital or printable stickers for their gallery.",
    category: "rewards" as Category,
  },
  {
    title: "Morning Routine",
    toolType: "visual-schedule",
    description:
      "Step-by-step visual schedule to reduce morning anxiety and build independence in start-of-day tasks.",
    category: "routines" as Category,
  },
  {
    title: "Bedtime Routine",
    toolType: "visual-schedule",
    description:
      "A calming visual guide for wind-down activities, helping transition into a restful night's sleep.",
    category: "routines" as Category,
  },
];

export function TemplatesPage() {
  const [active, setActive] = useState<Category>("all");

  const filtered =
    active === "all"
      ? mockTemplates
      : mockTemplates.filter((t) => t.category === active);

  return (
    <div className="max-w-7xl mx-auto px-8 py-12">
      {/* Header */}
      <section className="mb-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <h1 className="font-headline font-extrabold text-4xl md:text-5xl tracking-tight text-on-surface mb-4">
              Templates
            </h1>
            <p className="text-on-surface-variant text-lg leading-relaxed">
              Start with a proven template, customize for your child. Our
              therapeutic tools are designed by experts and refined by parents.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="inline-flex bg-surface-container-low p-1.5 rounded-lg gap-1">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setActive(cat.value)}
                className={cn(
                  "px-4 py-2 rounded-md font-label text-sm transition-all",
                  active === cat.value
                    ? "bg-surface-container-lowest text-primary font-semibold shadow-sm"
                    : "text-on-surface-variant font-medium hover:text-primary hover:bg-surface-container-high",
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map((template) => (
          <ToolCard
            key={template.title}
            title={template.title}
            toolType={template.toolType}
            description={template.description}
            variant="template"
          />
        ))}
      </div>

      {/* CTA Section */}
      <section className="mt-20 p-12 bg-surface-container-low rounded-xl relative overflow-hidden ring-1 ring-outline-variant/10">
        <div className="relative z-10 max-w-xl">
          <h2 className="font-headline font-bold text-3xl text-on-surface mb-4">
            Can&apos;t find what you&apos;re looking for?
          </h2>
          <p className="text-on-surface-variant text-lg mb-8">
            Our AI-powered builder can help you generate a custom tool from
            scratch based on your child&apos;s specific therapeutic goals.
          </p>
          <Link
            href="/builder"
            className="flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all duration-300"
          >
            Build a custom template
            <MaterialIcon icon="arrow_forward" size="sm" />
          </Link>
        </div>
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      </section>
    </div>
  );
}
