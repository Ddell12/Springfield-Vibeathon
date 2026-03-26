import { Suspense } from "react";

import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar";

// App shell: fixed sidebar + scrollable content area
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Suspense>
        <DashboardSidebar />
      </Suspense>
      <main
        id="main-content"
        className="flex flex-1 flex-col overflow-y-auto md:ml-20"
      >
        {children}
      </main>
    </div>
  );
}
