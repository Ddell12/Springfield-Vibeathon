"use client";

interface FamilyDashboardProps {
  paramsPromise: Promise<{ patientId: string }>;
}

export function FamilyDashboard({ paramsPromise }: FamilyDashboardProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <p className="text-on-surface-variant">Dashboard loading...</p>
    </div>
  );
}
