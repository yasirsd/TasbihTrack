"use client";
import * as React from "react";
import { useData } from "@/components/data/data-context";
import { groupByDay } from "@/lib/calculations/progress";
import { formatNumber } from "@/lib/format";
import { formatRelativeDate } from "@/lib/date-utils";
import { EntryItem } from "@/components/entries/entry-item";

export default function HistoryPage() {
  const { entries, trackers } = useData();
  const [filter, setFilter] = React.useState<string>("all");

  const filtered = React.useMemo(
    () => (filter === "all" ? entries : entries.filter((e) => e.trackerId === filter)),
    [entries, filter],
  );
  const groups = React.useMemo(() => groupByDay(filtered), [filtered]);
  const trackerMap = React.useMemo(
    () => new Map(trackers.map((t) => [t.id, t])),
    [trackers],
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="text-sm text-muted-foreground">Everything you've recorded, day by day.</p>
      </header>

      {trackers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            All goals
          </FilterChip>
          {trackers.map((t) => (
            <FilterChip key={t.id} active={filter === t.id} onClick={() => setFilter(t.id)}>
              {t.name}
            </FilterChip>
          ))}
        </div>
      )}

      {groups.length === 0 ? (
        <div className="rounded-3xl border border-border/60 bg-card p-8 text-center">
          <p className="text-base font-medium">No progress recorded yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            When you add progress, it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.key}>
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h2 className="text-sm font-medium">{formatRelativeDate(g.key)}</h2>
                <p className="text-xs tabular-nums text-muted-foreground">
                  +{formatNumber(g.total)}
                </p>
              </div>
              <div className="rounded-3xl border border-border/60 bg-card p-2">
                {g.entries.map((e) => (
                  <EntryItem key={e.id} entry={e} tracker={trackerMap.get(e.trackerId)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
        active
          ? "border-foreground/30 bg-foreground text-background"
          : "border-border/60 text-muted-foreground hover:bg-muted/40"
      }`}
    >
      {children}
    </button>
  );
}
