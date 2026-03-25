"use client";

import { useQuery } from "convex/react";
import { Bell, HelpCircle, Menu, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { EmptyState } from "@/shared/components/empty-state";
import { MobileNavDrawer } from "@/shared/components/mobile-nav-drawer";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

import { api } from "../../../../convex/_generated/api";
import { MainPromptInput } from "./main-prompt-input";
import { ProjectCard } from "./project-card";
import { TemplatesTab } from "./templates-tab";

const TEMPLATE_CHIPS = [
  "Token Board",
  "Visual Schedule",
  "Communication Board",
  "Social Story",
];

const VALID_TABS = ["recent", "my-projects", "shared", "templates"] as const;
type TabValue = (typeof VALID_TABS)[number];

export function DashboardView() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessions = useQuery(api.sessions.list);

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
    <main className="flex h-full flex-col overflow-y-auto bg-background">
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
              My Apps
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
            {sessions && sessions.length > 0 ? (
              <div className="grid grid-cols-1 gap-8 pb-20 md:grid-cols-2 lg:grid-cols-3">
                {sessions.map((session, i) => (
                  <ProjectCard
                    key={session._id}
                    project={{
                      id: session._id,
                      title: session.title,
                      thumbnail: null,
                      updatedAt: session._creationTime,
                      userInitial: session.title.charAt(0).toUpperCase(),
                      userColor: "bg-tertiary-fixed text-on-surface",
                    }}
                    index={i}
                  />
                ))}
              </div>
            ) : sessions?.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <div className="flex flex-col items-center justify-center pb-4 opacity-40">
                  <Sparkles size={32} className="mb-2" />
                </div>
                <p className="text-on-surface-variant">No apps yet — describe what you&apos;d like to build!</p>
                <Link href="/builder">
                  <Button>Create Your First App</Button>
                </Link>
              </div>
            ) : (
              /* Loading state */
              <div className="grid grid-cols-1 gap-8 pb-20 md:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-64 animate-pulse rounded-2xl bg-surface-container-low"
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-projects">
            <EmptyState
              variant="no-projects"
              title="No apps yet"
              description="Describe what your child needs, or browse templates to get started."
              primaryAction={{ label: "Start Building", href: "/builder" }}
              secondaryAction={{ label: "Browse Templates", href: "/dashboard?tab=templates" }}
            />
          </TabsContent>

          <TabsContent value="shared">
            <EmptyState
              variant="no-shared"
              title="Nothing shared with you yet"
              description="When someone shares an app with you, it will appear here."
              secondaryAction={{ label: "Explore Templates", href: "/dashboard?tab=templates" }}
            />
          </TabsContent>

          <TabsContent value="templates">
            <TemplatesTab />
          </TabsContent>
        </Tabs>
      </section>

    </main>
  );
}
