import { Skeleton } from "@/components/ui/skeleton";

export default function HistoryLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-3 w-56 opacity-60" />
      </div>
      <Skeleton className="h-9 w-full rounded-full" />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-32 rounded-full" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <div className="rounded-3xl border border-border/60 bg-card p-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="mt-2 h-8 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
