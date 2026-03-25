import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar />
      <main id="main-content" className="flex-1 overflow-hidden md:ml-20">
        {children}
      </main>
    </div>
  );
}
