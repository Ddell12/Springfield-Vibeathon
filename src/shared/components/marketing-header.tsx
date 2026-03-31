"use client";

import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";

const navLinks = [
  { href: "/demo-tools", label: "Meet Bridges" },
  { href: "/builder", label: "Platform" },
  { href: "/library?tab=templates", label: "Solutions" },
  { href: "/pricing", label: "Pricing" },
  { href: "/explore", label: "Learn" },
];

function MarketingHeaderContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isActiveLink = (href: string) => {
    const [targetPath, targetQuery] = href.split("?");
    if (pathname !== targetPath) return false;
    if (!targetQuery) return true;
    const params = new URLSearchParams(targetQuery);
    return [...params.entries()].every(
      ([key, value]) => searchParams.get(key) === value
    );
  };

  return (
    <header className="z-50 bg-background">
      <nav className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-6 py-5 lg:px-10">
        <div className="flex items-center gap-12">
          <Link
            href="/"
            className="font-headline text-[2rem] tracking-[-0.04em] text-on-surface"
          >
            Bridges
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex min-h-[44px] items-center rounded-full px-3 py-2 text-sm font-medium transition-colors",
                  isActiveLink(href)
                    ? "bg-surface text-on-surface"
                    : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Show when="signed-out">
            <Link
              href="mailto:hello@bridges.ai"
              className="hidden min-h-[44px] items-center rounded-xl border border-border bg-surface px-4 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-low md:flex"
            >
              Contact sales
            </Link>
          </Show>
          <Link
            href="/sign-in?role=slp"
            className="hidden min-h-[44px] items-center gap-2 rounded-xl bg-on-surface px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-92 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:flex"
          >
            Try Bridges
          </Link>
          <Show when="signed-in">
            <div className="hidden md:flex">
              <UserButton />
            </div>
          </Show>

          {/* Mobile hamburger */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <MaterialIcon icon="menu" size="sm" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <SheetDescription className="sr-only">Main navigation menu</SheetDescription>
                <nav className="flex flex-col gap-2 mt-8">
                  {navLinks.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "rounded-lg px-3 py-2 text-base font-medium transition-colors",
                        isActiveLink(href)
                          ? "bg-surface-container-low text-on-surface"
                          : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                      )}
                    >
                      {label}
                    </Link>
                  ))}
                  <Link
                    href="mailto:hello@bridges.ai"
                    className="mt-4 rounded-lg border border-border px-6 py-3 text-center text-sm font-medium text-on-surface"
                  >
                    Contact sales
                  </Link>
                  <Show when="signed-out">
                    <Link
                      href="/sign-in?role=slp"
                      className="mt-2 rounded-lg bg-on-surface px-6 py-3 text-center text-sm font-semibold text-background"
                    >
                      Try Bridges
                    </Link>
                  </Show>
                  <Show when="signed-in">
                    <div className="mt-4 flex justify-center">
                      <UserButton />
                    </div>
                  </Show>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </header>
  );
}

export function MarketingHeader() {
  return (
    <Suspense fallback={<div className="h-[76px] bg-background" />}>
      <MarketingHeaderContent />
    </Suspense>
  );
}
