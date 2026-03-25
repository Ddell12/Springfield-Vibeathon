"use client";

import { useTheme } from "next-themes";

import { cn } from "@/core/utils";

const _THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-2xl font-headline font-bold text-primary">Appearance</h2>

      <div className="grid grid-cols-3 gap-4">
        {/* Light Theme Card */}
        <button
          onClick={() => setTheme("light")}
          className="cursor-pointer group text-left"
        >
          <div
            className={cn(
              "aspect-[4/3] rounded-lg bg-surface-container mb-3 flex items-center justify-center transition-all",
              theme === "light"
                ? "border-2 border-primary ring-2 ring-transparent ring-offset-2"
                : "hover:ring-2 hover:ring-outline-variant/30"
            )}
          >
            <div className="w-16 h-10 bg-white rounded-sm shadow-sm flex flex-col p-1 gap-1">
              <div className="h-1 w-full bg-surface-container rounded-full" />
              <div className="h-1 w-2/3 bg-surface-container rounded-full" />
            </div>
          </div>
          <span
            className={cn(
              "text-sm block text-center",
              theme === "light"
                ? "font-semibold text-primary"
                : "font-medium text-on-surface-variant"
            )}
          >
            Light
          </span>
        </button>

        {/* Dark Theme Card */}
        <button
          onClick={() => setTheme("dark")}
          className="cursor-pointer group text-left"
        >
          <div
            className={cn(
              "aspect-[4/3] rounded-lg bg-inverse-surface mb-3 flex items-center justify-center transition-all",
              theme === "dark"
                ? "border-2 border-primary ring-2 ring-transparent ring-offset-2"
                : "hover:ring-2 hover:ring-outline-variant/30"
            )}
          >
            <div className="w-16 h-10 bg-slate-800 rounded-sm shadow-sm flex flex-col p-1 gap-1">
              <div className="h-1 w-full bg-slate-700 rounded-full" />
              <div className="h-1 w-2/3 bg-slate-700 rounded-full" />
            </div>
          </div>
          <span
            className={cn(
              "text-sm block text-center",
              theme === "dark"
                ? "font-semibold text-primary"
                : "font-medium text-on-surface-variant"
            )}
          >
            Dark
          </span>
        </button>

        {/* System Theme Card */}
        <button
          onClick={() => setTheme("system")}
          className="cursor-pointer group text-left"
        >
          <div
            className={cn(
              "aspect-[4/3] rounded-lg bg-gradient-to-br from-surface-container to-inverse-surface mb-3 flex items-center justify-center overflow-hidden relative transition-all",
              theme === "system"
                ? "border-2 border-primary ring-2 ring-transparent ring-offset-2"
                : "hover:ring-2 hover:ring-outline-variant/30"
            )}
          >
            <div className="w-16 h-10 bg-white/10 backdrop-blur-md rounded-sm shadow-sm flex flex-col p-1 gap-1 z-10">
              <div className="h-1 w-full bg-primary/20 rounded-full" />
              <div className="h-1 w-2/3 bg-primary/20 rounded-full" />
            </div>
          </div>
          <span
            className={cn(
              "text-sm block text-center",
              theme === "system"
                ? "font-semibold text-primary"
                : "font-medium text-on-surface-variant"
            )}
          >
            System
          </span>
        </button>
      </div>
    </div>
  );
}
