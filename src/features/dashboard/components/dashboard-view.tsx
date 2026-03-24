"use client";

import { AnimatedGradient } from "@/shared/components/animated-gradient";

import { DashboardSidebar } from "./dashboard-sidebar";
import { MainPromptInput } from "./main-prompt-input";

export function DashboardView() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AnimatedGradient />
      
      <DashboardSidebar />
      
      <main className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-y-auto">
        {/* Top-right User Profile (optional duplicate of sidebar or simple sign-out) */}
        
        <div className="w-full max-w-4xl flex flex-col items-center justify-center gap-8 -mt-20">
          <div className="flex flex-col items-center text-center gap-2">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground font-headline">
              Let&apos;s create, Builder
            </h1>
            <p className="text-muted text-lg mt-2 font-medium">
              Describe your idea, and Bridges will build it instantly.
            </p>
          </div>
          
          <MainPromptInput />
          
          <div className="flex gap-4 mt-6 text-sm text-muted font-medium items-center">
            <span>Or start with a template:</span>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 rounded-full border border-surface-container bg-surface-container-low hover:bg-surface-container hover:text-foreground transition-colors">
                Personal Portfolio
              </button>
              <button className="px-3 py-1.5 rounded-full border border-surface-container bg-surface-container-low hover:bg-surface-container hover:text-foreground transition-colors">
                CRM Dashboard
              </button>
              <button className="px-3 py-1.5 rounded-full border border-surface-container bg-surface-container-low hover:bg-surface-container hover:text-foreground transition-colors">
                Landing Page
              </button>
            </div>
          </div>
        </div>
        
        {/* Templates Shelf at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background to-transparent pb-8 px-12 flex items-end justify-center pointer-events-none">
          <div className="w-full max-w-5xl bg-surface/80 backdrop-blur-xl border border-surface-container rounded-t-3xl h-24 shadow-2xl pointer-events-auto flex items-center px-6 justify-between">
            <span className="font-bold text-sm bg-surface-container-high px-3 py-1.5 rounded-lg">Templates</span>
            <span className="text-sm font-medium text-muted hover:text-foreground cursor-pointer flex items-center gap-1">
              Browse all &rarr;
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
