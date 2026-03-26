import { Suspense } from "react";

import { DashboardView } from "@/features/dashboard/components/dashboard-view";

export default function Page() {
  return (
    <Suspense>
      <DashboardView />
    </Suspense>
  );
}
