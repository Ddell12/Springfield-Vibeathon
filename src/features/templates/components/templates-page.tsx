"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Input } from "@/shared/components/ui/input";

import { THERAPY_SEED_PROMPTS } from "../../../../convex/templates/therapy_seeds";

const PRIMARY_GRADIENT = "from-primary to-primary-container";

const TEMPLATE_STYLES = [
  { gradient: PRIMARY_GRADIENT, icon: "chat" },
  { gradient: "from-tertiary to-tertiary-container", icon: "light_mode" },
  { gradient: "from-tertiary-fixed-dim to-tertiary-fixed", icon: "star" },
  { gradient: "from-secondary to-secondary-container", icon: "menu_book" },
];

const CATEGORIES = [
  { label: "All", value: "all" },
  { label: "Communication", value: "communication" },
  { label: "Social Skills", value: "social-story" },
  { label: "Daily Living", value: "schedule" },
  { label: "Academic", value: "academic" },
  { label: "Sensory", value: "sensory" },
  { label: "Reward", value: "reward" },
] as const;

type SortOption = "popular" | "newest" | "alphabetical";

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: "Popular", value: "popular" },
  { label: "Newest", value: "newest" },
  { label: "A–Z", value: "alphabetical" },
];

const PAGE_SIZE = 12;

interface TemplatesPageProps {
  embedded?: boolean;
}

export function TemplatesPage({ embedded = false }: TemplatesPageProps) {
  const searchParams = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("popular");

  const pageParam = searchParams?.get("page");
  const parsedPage = Number.parseInt(pageParam ?? "", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredTemplates = useMemo(() => {
    let results = [...THERAPY_SEED_PROMPTS];

    // Filter by category
    if (selectedCategory !== "all") {
      results = results.filter((t) => t.category === selectedCategory);
    }

    // Filter by search query
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      results = results.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q),
      );
    }

    // Sort
    switch (sortBy) {
      case "alphabetical":
        results.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "newest":
        // Seeds don't have timestamps — reverse the natural order (last = newest)
        results.reverse();
        break;
      case "popular":
      default:
        // Keep default order (seed order = curated popularity)
        break;
    }

    return results;
  }, [selectedCategory, debouncedSearch, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredTemplates.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredTemplates.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Header */}
      {!embedded && (
        <section className="mb-12 text-center">
          <h1 className="font-headline font-normal text-4xl md:text-5xl tracking-tight text-on-surface mb-4">
            Start with a Template
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed max-w-2xl mx-auto">
            Choose a proven therapy app template and watch it get built in real time.
            Customize it with your own words, images, and goals.
          </p>
        </section>
      )}

      {/* Search + Sort Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <MaterialIcon
            icon="search"
            size="sm"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <Input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-surface-container-low"
            aria-label="Search templates"
          />
        </div>
        <div className="flex gap-1 rounded-xl bg-surface-container-low p-1">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSortBy(option.value)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300",
                sortBy === option.value
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category Filter Bar */}
      <div className="flex flex-wrap gap-2 mb-8" role="tablist" aria-label="Template categories">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            role="tab"
            aria-selected={selectedCategory === cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
              selectedCategory === cat.value
                ? "bg-primary text-on-primary shadow-sm"
                : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Template Grid */}
      {pageItems.length === 0 ? (
        <div className="py-20 text-center" data-testid="no-results">
          <MaterialIcon icon="search_off" className="text-5xl text-on-surface-variant/40 mb-4" />
          <p className="text-on-surface-variant text-lg">
            No templates match your search. Try a different keyword or category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {pageItems.map((template, i) => {
            const style = TEMPLATE_STYLES[i % TEMPLATE_STYLES.length];
            return (
              <Link
                key={template.id}
                href={`/builder?prompt=${encodeURIComponent(template.prompt)}`}
                className="group relative overflow-hidden rounded-2xl bg-surface-container-lowest transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                data-testid="template-card"
              >
                {/* Gradient or Image thumbnail */}
                <div
                  className={cn(
                    "relative h-48 bg-gradient-to-br flex items-center justify-center",
                    !("imageUrl" in template) && style.gradient,
                  )}
                >
                  {"imageUrl" in template && template.imageUrl ? (
                    <Image
                      src={template.imageUrl as string}
                      alt={template.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <MaterialIcon icon={style.icon} size="2xl" className="text-white/30" />
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center p-6 z-10">
                    <p className="text-white text-sm leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-center">
                      {template.description}
                    </p>
                  </div>
                </div>

                {/* Card footer */}
                <div className="p-5">
                  <h3 className="font-body font-medium text-lg text-on-surface group-hover:text-primary transition-colors">
                    {template.title}
                  </h3>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-on-surface-variant text-sm">Click to build</p>
                    <span className="text-on-surface-variant/60 text-xs capitalize">
                      {template.category}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* CTA Section */}
      <section className="p-12 bg-surface-container-low rounded-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <h2 className="font-headline font-normal text-3xl text-on-surface mb-4">
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
