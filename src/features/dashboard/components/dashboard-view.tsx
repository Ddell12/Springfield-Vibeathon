"use client";

import { Bell, HelpCircle, Menu, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { EmptyState } from "@/shared/components/empty-state";
import { MobileNavDrawer } from "@/shared/components/mobile-nav-drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

import { MainPromptInput } from "./main-prompt-input";
import { ProjectCard, type ProjectData } from "./project-card";
import { TemplatesTab } from "./templates-tab";

const TEMPLATE_CHIPS = [
  "Token Board",
  "Visual Schedule",
  "Communication Board",
  "Social Story",
];

// Placeholder projects for layout -- will be replaced with real data from Convex
const SAMPLE_PROJECTS: ProjectData[] = [
  {
    id: "1",
    title: "Morning Routine Schedule",
    thumbnail: null,
    updatedAt: Date.now() - 2 * 60 * 60 * 1000,
    userInitial: "D",
    userColor: "bg-tertiary-fixed text-on-surface",
  },
  {
    id: "2",
    title: "Calm Down Choices",
    thumbnail: null,
    updatedAt: Date.now() - 5 * 60 * 60 * 1000,
    userInitial: "JD",
    userColor: "bg-tertiary-fixed text-on-surface",
  },
  {
    id: "3",
    title: "Playground Safety Story",
    thumbnail: null,
    updatedAt: Date.now() - 24 * 60 * 60 * 1000,
    userInitial: "M",
    userColor: "bg-tertiary-fixed text-on-surface",
  },
];

const VALID_TABS = ["recent", "my-projects", "shared", "templates"] as const;
type TabValue = (typeof VALID_TABS)[number];

export function DashboardView() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab");
  const activeTab: TabValue = VALID_TABS.includes(tabParam as TabValue)
    ? (tabParam as TabValue)
    : "recent";

  function handleTabChange(value: string) {
    if (value === "recent") {
      router.replace("/dashboard");
    } else {
      router.replace(`/dashboard?tab=${value}`);
    }
  }

  return (
    <main className="flex h-screen flex-1 flex-col overflow-y-auto bg-background">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between bg-background/70 px-4 backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-surface-container-low transition-colors active:scale-95"
            aria-label="Open navigation menu"
          >
            <Menu size={24} className="text-primary" />
          </button>
          <span className="font-headline font-bold tracking-tight text-lg text-primary">
            Bridges
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-600 text-xs font-bold text-white">
            D
          </div>
        </div>
      </header>

      <MobileNavDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />

      {/* Desktop Top Nav Bar */}
      <header className="sticky top-0 z-30 hidden h-16 w-full items-center justify-between bg-background/70 px-8 backdrop-blur-xl md:flex">
        <div className="flex items-center gap-3">
          <h1 className="font-headline text-xl font-extrabold tracking-tight text-primary">
            Bridges AI
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-on-surface-variant/50">
            <Bell
              size={20}
              className="pointer-events-none"
            />
            <HelpCircle
              size={20}
              className="pointer-events-none"
            />
          </div>
          <Link
            href="/builder"
            className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-primary to-primary-container px-5 py-2 font-headline text-sm font-semibold text-white opacity-80 shadow-sm transition-all active:opacity-100"
          >
            Create New
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-4xl px-6 pb-16 pt-20 text-center">
        <h2 className="mb-4 font-headline text-5xl font-bold tracking-tight text-on-surface">
          What would you like to build?
        </h2>
        <p className="mb-10 font-body text-lg text-on-surface-variant">
          Describe your idea, and Bridges will build it instantly.
        </p>

        {/* Wide Input */}
        <MainPromptInput />

        {/* Template Chips */}
        <div className="flex flex-wrap justify-center gap-3">
          {TEMPLATE_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => router.push(`/builder?prompt=${encodeURIComponent(`Build a ${chip} for a child`)}`)}
              className="rounded-full bg-surface-container-low px-5 py-2 font-body text-sm text-on-surface-variant ring-1 ring-outline-variant/10 transition-colors hover:bg-surface-container-high"
            >
              {chip}
            </button>
          ))}
        </div>
      </section>

      {/* Tab & Grid Container */}
      <section className="mt-8 min-h-full rounded-t-[3rem] bg-surface-container-low px-12 pt-16">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList variant="line" className="mb-10 gap-10 border-b border-outline-variant/10">
            <TabsTrigger
              value="recent"
              className="pb-4 font-body text-sm data-[state=active]:font-bold data-[state=active]:text-primary data-[state=active]:after:bg-primary"
            >
              Recently viewed
            </TabsTrigger>
            <TabsTrigger
              value="my-projects"
              className="pb-4 font-body text-sm text-on-surface-variant hover:text-primary-container"
            >
              My projects
            </TabsTrigger>
            <TabsTrigger
              value="shared"
              className="pb-4 font-body text-sm text-on-surface-variant hover:text-primary-container"
            >
              Shared with me
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              className="pb-4 font-body text-sm text-on-surface-variant hover:text-primary-container"
            >
              Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recent">
            <div className="grid grid-cols-1 gap-8 pb-20 md:grid-cols-2 lg:grid-cols-3">
              {SAMPLE_PROJECTS.map((project, i) => (
                <ProjectCard key={project.id} project={project} index={i} />
              ))}
            </div>
            {/* Empty state hint */}
            <div className="flex flex-col items-center justify-center pb-20 opacity-40">
              <Sparkles size={32} className="mb-2" />
              <p className="font-body text-sm">
                Start by describing what you need — or pick a template above.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="my-projects">
            <EmptyState
              variant="no-projects"
              title="No tools yet"
              description="Describe what your child needs, or browse templates to get started."
              primaryAction={{ label: "Start Building", href: "/builder" }}
              secondaryAction={{ label: "Browse Templates", href: "/dashboard?tab=templates" }}
            />
          </TabsContent>

          <TabsContent value="shared">
            <EmptyState
              variant="no-shared"
              title="Nothing shared with you yet"
              description="When someone shares a tool with you, it will appear here."
              secondaryAction={{ label: "Explore Templates", href: "/dashboard?tab=templates" }}
            />
          </TabsContent>

          <TabsContent value="templates">
            <TemplatesTab />
          </TabsContent>
        </Tabs>
      </section>

      {/* Floating Action Button */}
      <Link
        href="/builder"
        className="group fixed bottom-10 right-10 z-50 flex h-16 items-center gap-3 rounded-full bg-gradient-to-br from-primary to-primary-container px-8 font-headline font-bold text-white shadow-2xl transition-transform hover:scale-105 active:scale-95"
      >
        <Plus size={22} fill="currentColor" />
        <span>New Session</span>
      </Link>
    </main>
  );
}
