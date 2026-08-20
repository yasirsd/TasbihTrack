import { Skeleton } from "@/components/ui/skeleton";

/**
 * Only used when the tracker/entries data is genuinely unresolved (no cached
 * snapshot). If the IndexedDB cache is populated, the DataProvider hydrates
 * instantly and this file is not shown.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-3 w-32 opacity-60" />
      </div>

      <div className="clay-card space-y-3 rounded-3xl border border-border/60 bg-card p-6">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-12 w-40" />
        <Skeleton className="h-3 w-48 opacity-60" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-3 w-24" />
        <TrackerCardSkeleton />
        <TrackerCardSkeleton />
      </div>
    </div>
  );
}

function TrackerCardSkeleton() {
  return (
    <div className="clay-card space-y-4 rounded-3xl border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
      <div className="flex items-end justify-between">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <Skeleton className="h-10 w-full rounded-full" />
    </div>
  );
}
