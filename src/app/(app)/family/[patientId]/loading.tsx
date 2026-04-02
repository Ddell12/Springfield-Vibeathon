import { Skeleton } from "@/shared/components/ui/skeleton";

export default function FamilyDashboardLoading() {
  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto w-full">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-14 rounded-xl" />
      <Skeleton className="h-12 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-20 rounded-xl" />
    </div>
  );
}
