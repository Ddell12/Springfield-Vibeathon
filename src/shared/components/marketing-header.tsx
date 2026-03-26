"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/shared/components/ui/sheet";

const navLinks = [
  { href: "/builder", label: "Builder" },
  { href: "/templates", label: "Templates" },
  { href: "/my-tools", label: "My Apps" },
];

export function MarketingHeader() {
  const pathname = usePathname();

  return (
    <header className="bg-surface/80 backdrop-blur-lg sticky top-0 z-50">
      <nav className="flex justify-between items-center w-full px-8 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-12">
          <Link
            href="/"
            className="text-primary font-extrabold text-2xl tracking-tighter font-headline"
          >
            Bridges
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "font-headline font-bold text-lg tracking-tight transition-colors rounded-lg px-3 py-1",
                  pathname === href
                    ? "text-primary border-b-2 border-primary pb-1"
                    : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low"
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/builder"
            className="hidden md:flex items-center gap-2 bg-primary-gradient text-on-primary px-6 py-2.5 rounded-lg font-semibold text-sm shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all active:scale-95"
          >
            Start Building
          </Link>

          {/* Mobile hamburger */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <MaterialIcon icon="menu" size="sm" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <nav className="flex flex-col gap-2 mt-8">
                  {navLinks.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "font-headline font-bold text-lg px-3 py-2 rounded-lg transition-colors",
                        pathname === href
                          ? "text-primary bg-primary/5"
                          : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low"
                      )}
                    >
                      {label}
                    </Link>
                  ))}
                  <Link
                    href="/builder"
                    className="mt-4 bg-primary-gradient text-on-primary px-6 py-3 rounded-lg font-semibold text-sm text-center"
                  >
                    Start Building
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </header>
  );
}
