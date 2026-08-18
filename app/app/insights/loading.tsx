import { Skeleton } from "@/components/ui/skeleton";

export default function InsightsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-3 w-56 opacity-60" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/60 bg-card p-4">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="mt-2 h-6 w-16" />
          </div>
        ))}
      </div>
      <div className="rounded-3xl border border-border/60 bg-card p-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-4 h-40 w-full rounded-2xl" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/60 bg-card p-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
