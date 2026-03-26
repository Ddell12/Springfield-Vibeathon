import { Suspense } from "react";

import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar";
import { MobileTopBar } from "@/features/dashboard/components/mobile-top-bar";

// App shell: fixed sidebar + scrollable content area
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Suspense>
        <DashboardSidebar />
      </Suspense>
      <main
        id="main-content"
        className="flex flex-1 flex-col overflow-y-auto md:ml-20"
      >
        <MobileTopBar />
        {children}
      </main>
    </div>
  );
}
