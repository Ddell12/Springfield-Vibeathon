"use client";

import { Plus, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/core/utils";
import { NAV_ITEMS, isNavActive } from "@/shared/lib/navigation";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/shared/components/ui/sheet";

interface MobileNavDrawerProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function MobileNavDrawer({ open, onOpenChange }: MobileNavDrawerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  function handleNavClick() {
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="w-[280px] bg-surface-container-lowest rounded-r-2xl p-6 flex flex-col border-none"
      >
        {/* Accessible title (visually hidden) */}
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">
          Main navigation menu for Bridges
        </SheetDescription>

        {/* Header */}
        <div className="flex flex-col mb-8">
          <div className="flex items-center justify-between mb-8">
            <span className="font-headline font-bold text-primary text-2xl tracking-tighter">
              Bridges
            </span>
            <button
              onClick={() => onOpenChange(false)}
              className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-container-low transition-colors active:scale-95"
              aria-label="Close navigation"
            >
              <X size={20} className="text-on-surface-variant" />
            </button>
          </div>

          {/* Profile area */}
          <div className="flex items-center gap-4 p-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-600 text-lg font-bold text-white">
              D
            </div>
            <div className="flex flex-col">
              <span className="font-headline font-bold text-on-surface">
                Desha
              </span>
              <span className="text-xs text-on-surface-variant">
                desha@email.com
              </span>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = isNavActive(item.href, pathname, tab);
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold min-h-[44px] transition-all active:opacity-80",
                  isActive
                    ? "bg-primary/10 text-primary font-bold"
                    : "text-on-surface-variant hover:bg-surface-container-low"
                )}
              >
                <Icon
                  size={22}
                  fill={isActive ? "currentColor" : "none"}
                />
                <span className="font-headline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="mt-auto pt-6 flex flex-col gap-4">
          <Button
            asChild
            className="w-full h-14 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-transform"
          >
            <Link href="/builder" onClick={handleNavClick}>
              <Plus size={20} />
              <span>New Project</span>
            </Link>
          </Button>
          <div className="flex justify-center">
            <span className="text-[10px] text-on-surface-variant/60 uppercase tracking-widest font-medium">
              Version 1.0
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
