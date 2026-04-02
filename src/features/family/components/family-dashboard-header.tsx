"use client";

interface FamilyDashboardHeaderProps {
  patient: { name?: string } | null | undefined;
}

export function FamilyDashboardHeader({ patient }: FamilyDashboardHeaderProps) {
  return (
    <div className="space-y-1">
      <h1 className="font-headline text-2xl font-semibold">{patient?.name ?? "Family Dashboard"}</h1>
    </div>
  );
}
