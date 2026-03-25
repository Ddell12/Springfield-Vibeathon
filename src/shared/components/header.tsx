"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_NAME } from "@/core/config";
import { cn } from "@/core/utils";
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

export function Header() {
  const pathname = usePathname();

  return (
    <header className="h-16 bg-surface border-b border-border w-full">
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
                pathname === href
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
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <nav className="flex flex-col gap-2 mt-8">
                {navLinks.map(({ href, label }) => (
                  <Button
                    key={href}
                    asChild
                    variant="ghost"
                    className={cn(
                      "justify-start text-sm font-medium",
                      pathname === href
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
