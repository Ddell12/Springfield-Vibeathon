import { Suspense } from "react";

import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar";
import { AppHeader } from "@/shared/components/app-header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Suspense>
        <DashboardSidebar />
      </Suspense>
      {/* md:ml-14 = collapsed sidebar width (w-14). Sidebar uses fixed overlay positioning —
          content is visible under expanded sidebar. Push-content behavior is a future enhancement. */}
      <main
        id="main-content"
        className="flex flex-1 flex-col overflow-y-auto md:ml-14 transition-[margin] duration-300"
      >
        <AppHeader />
        {children}
      </main>
    </div>
  );
}
