"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { api } from "../../../../convex/_generated/api";

type Category = "all" | "Communication" | "Behavior Support" | "Daily Routines" | "Academic";

const categories: { value: Category; label: string }[] = [
  { value: "all", label: "All" },
  { value: "Communication", label: "Communication" },
  { value: "Behavior Support", label: "Behavior Support" },
  { value: "Daily Routines", label: "Daily Routines" },
  { value: "Academic", label: "Academic" },
];

export function TemplatesPage() {
  const [active, setActive] = useState<Category>("all");

  const allTemplates = useQuery(
    api.therapy_templates.list,
    active === "all" ? {} : "skip"
  );
  const categoryTemplates = useQuery(
    api.therapy_templates.getByCategory,
    active !== "all" ? { category: active } : "skip"
  );
  const templates = active === "all" ? allTemplates : categoryTemplates;
  const isLoading = templates === undefined;

  return (
    <div className="max-w-7xl mx-auto px-8 py-12">
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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <p className="text-on-surface-variant text-lg font-medium">
            No templates found for this category.
          </p>
          <Link
            href="/builder"
            className="text-primary font-semibold hover:underline"
          >
            Build your own tool
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {(templates as Array<{ _id: string; name: string; category: string; description: string; starterPrompt: string }>).map((template) => (
            <Link
              key={template._id}
              href={`/builder?template=${template._id}`}
              className="group bg-surface-container-lowest rounded-xl p-6 ring-1 ring-outline-variant/10 hover:ring-primary/30 transition-all hover:shadow-lg"
            >
              <div className="mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-md">
                  {template.category}
                </span>
              </div>
              <h3 className="font-headline font-bold text-lg text-on-surface mb-2 group-hover:text-primary transition-colors">
                {template.name}
              </h3>
              <p className="text-on-surface-variant text-sm leading-relaxed mb-4">
                {template.description}
              </p>
              <span className="text-primary font-semibold text-sm flex items-center gap-1">
                Use Template
                <MaterialIcon icon="arrow_forward" size="sm" className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      )}

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
            Create a custom tool
            <MaterialIcon icon="arrow_forward" size="sm" />
          </Link>
        </div>
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      </section>
    </div>
  );
}
