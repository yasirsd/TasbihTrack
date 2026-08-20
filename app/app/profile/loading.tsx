import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-3 w-40 opacity-60" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <section key={i} className="clay-card space-y-3 rounded-3xl border border-border/60 bg-card p-5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-10 w-full rounded-2xl" />
          <Skeleton className="h-10 w-full rounded-2xl" />
        </section>
      ))}
    </div>
  );
}
