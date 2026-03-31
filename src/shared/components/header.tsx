"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { APP_NAME } from "@/core/config";
import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";

const navLinks = [
  { href: "/builder", label: "Builder" },
  { href: "/library?tab=templates", label: "Templates" },
  { href: "/library?tab=my-apps", label: "My Apps" },
];

export function Header() {
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
    <header className="h-16 bg-surface w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-primary font-bold text-xl">
          {APP_NAME}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label }) => (
            <Button
              key={href}
              asChild
              variant="ghost"
              className={cn(
                "text-sm font-medium",
                isActiveLink(href)
                  ? "text-primary bg-primary/10"
                  : "text-foreground"
              )}
            >
              <Link href={href}>{label}</Link>
            </Button>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <MaterialIcon icon="menu" size="sm" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation menu</SheetTitle>
                <SheetDescription>
                  Open the builder or library sections of Bridges.
                </SheetDescription>
              </SheetHeader>
              <nav className="flex flex-col gap-2 mt-8">
                {navLinks.map(({ href, label }) => (
                  <Button
                    key={href}
                    asChild
                    variant="ghost"
                    className={cn(
                      "justify-start text-sm font-medium",
                      isActiveLink(href)
                        ? "text-primary bg-primary/10"
                        : "text-foreground"
                    )}
                  >
                    <Link href={href}>{label}</Link>
                  </Button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
