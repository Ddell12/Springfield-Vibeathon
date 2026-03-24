"use client";

import { usePathname } from "next/navigation";

import { BuilderSidebar } from "@/features/builder/components/builder-sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isBuilder = pathname === "/builder";

  // Builder v2 has its own header/layout — skip the sidebar
  if (isBuilder) {
    return (
      <div className="flex h-screen overflow-hidden">
        <main id="main-content" className="flex-1 overflow-hidden">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <BuilderSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main id="main-content" className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
