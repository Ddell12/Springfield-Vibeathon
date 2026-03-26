"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export function MobileTopBar() {
  return (
    <header className="flex items-center justify-between px-4 py-3 md:hidden bg-surface-container">
      <Link
        href="/"
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-container text-sm font-bold text-white"
      >
        B
      </Link>
      <UserButton />
    </header>
  );
}
