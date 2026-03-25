"use client";

import { BookOpen, MessageSquare, Star, Sun } from "lucide-react";
import Link from "next/link";

import { cn } from "@/core/utils";

import { THERAPY_SEED_PROMPTS } from "../../../../convex/templates/therapy_seeds";

const PRIMARY_GRADIENT = "from-primary to-primary-container";

const TEMPLATE_STYLES = [
  { gradient: PRIMARY_GRADIENT, Icon: MessageSquare },
  { gradient: "from-[#2e7d32] to-[#66bb6a]", Icon: Sun },
  { gradient: "from-[#f59e0b] to-[#fbbf24]", Icon: Star },
  { gradient: "from-[#5c6bc0] to-[#7986cb]", Icon: BookOpen },
];

export function TemplatesPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Header */}
      <section className="mb-12 text-center">
        <h1 className="font-headline font-extrabold text-4xl md:text-5xl tracking-tight text-on-surface mb-4">
          Start with a Template
        </h1>
        <p className="text-on-surface-variant text-lg leading-relaxed max-w-2xl mx-auto">
          Choose a proven therapy app template and watch it get built in real time.
          Customize it with your own words, images, and goals.
        </p>
      </section>

      {/* 2x2 Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
        {THERAPY_SEED_PROMPTS.map((template, i) => {
          const style = TEMPLATE_STYLES[i % TEMPLATE_STYLES.length];
          return (
            <Link
              key={template.id}
              href={`/builder?prompt=${encodeURIComponent(template.prompt)}`}
              className="group relative overflow-hidden rounded-2xl bg-surface-container-lowest transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              {/* Gradient thumbnail */}
              <div
                className={cn(
                  "relative h-48 bg-gradient-to-br flex items-center justify-center",
                  style.gradient,
                )}
              >
                <style.Icon className="h-16 w-16 text-white/30" strokeWidth={1.5} />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center p-6">
                  <p className="text-white text-sm leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-center">
                    {template.description}
                  </p>
                </div>
              </div>

              {/* Card footer */}
              <div className="p-5">
                <h3 className="font-headline font-bold text-lg text-on-surface group-hover:text-primary transition-colors">
                  {template.title}
                </h3>
                <p className="text-on-surface-variant text-sm mt-1">Click to build</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* CTA Section */}
      <section className="p-12 bg-surface-container-low rounded-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <h2 className="font-headline font-bold text-3xl text-on-surface mb-4">
            Have something else in mind?
          </h2>
          <p className="text-on-surface-variant text-lg mb-8">
            Describe any therapy app and our AI builder will create it for you.
          </p>
          <Link
            href="/builder"
            className={cn(
              "inline-flex items-center gap-2 bg-gradient-to-r text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity",
              PRIMARY_GRADIENT,
            )}
          >
            Build a Custom App
          </Link>
        </div>
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      </section>
    </div>
  );
}
