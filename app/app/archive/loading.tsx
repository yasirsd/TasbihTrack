import { Skeleton } from "@/components/ui/skeleton";

export default function ArchiveLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3 w-56 opacity-60" />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-3xl border border-border/60 bg-card p-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-2 h-3 w-32 opacity-60" />
          </div>
        ))}
      </div>
    </div>
  );
}
