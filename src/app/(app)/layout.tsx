"use client";

import { BuilderSidebar } from "@/features/builder/components/builder-sidebar";
import { BuilderHeader } from "@/features/builder/components/builder-header";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <BuilderSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <BuilderHeader />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
