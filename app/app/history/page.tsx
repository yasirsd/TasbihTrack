"use client";
import * as React from "react";
import { useData } from "@/components/data/data-context";
import { groupByDay } from "@/lib/calculations/progress";
import { formatNumber } from "@/lib/format";
import { formatRelativeDate } from "@/lib/date-utils";
import { EntryItem } from "@/components/entries/entry-item";
import { Segmented } from "@/components/ui/segmented";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const TasbihCalendar = dynamic(
  () => import("@/components/calendar/tasbih-calendar").then((m) => m.TasbihCalendar),
  { ssr: false, loading: () => <div className="clay-skeleton h-64 animate-pulse rounded-2xl bg-muted/30 motion-reduce:animate-none" /> },
);

type View = "timeline" | "calendar";

/**
 * History — Phase 7.2 P0.4 Clay rebuild.
 *
 * Visual language changes:
 *   • Timeline / Calendar switch now uses the shared `Segmented`
 *     primitive so its Clay treatment (inset tray + raised active pill)
 *     matches the auth surface and Insights range picker exactly.
 *   • Goal filter chips use `.clay-chip` — larger touch area (≥40 px)
 *     and unmistakable selected state.
 *   • Each entry row sits in its own `.clay-list-row` pill instead of
 *     a single divided pillbox. Lighter shadow recipe (per the elevation
 *     model) so long scrolls don't get expensive.
 *   • Date-group headings stay as typography-only — the spec explicitly
 *     forbids wrapping every date in a card.
 */
export default function HistoryPage() {
  const { entries, trackers } = useData();
  const [filter, setFilter] = React.useState<string>("all");
  const [view, setView] = React.useState<View>("timeline");

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
      <header className="px-1">
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Everything you&apos;ve recorded, day by day.
        </p>
      </header>

      <Segmented<View>
        ariaLabel="Timeline or calendar"
        value={view}
        onChange={setView}
        // Phase 7.2 P0.1 touch-target closure — lifted from md (44 px)
        // to lg (52 px) so the History view switch meets the same
        // audit as the Auth mode segmented.
        size="lg"
        options={[
          { value: "timeline", label: "Timeline" },
          { value: "calendar", label: "Calendar" },
        ]}
      />

      {trackers.length > 0 && (
        <div
          className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Filter by goal"
        >
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

      {view === "calendar" ? (
        <TasbihCalendar trackerId={filter === "all" ? undefined : filter} />
      ) : groups.length === 0 ? (
        <div className="clay-card clay-raised rounded-3xl border border-border/60 bg-card p-8 text-center">
          <p className="text-base font-medium">No progress recorded yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            When you add progress, it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.key}>
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h2 className="text-sm font-medium">{formatRelativeDate(g.key)}</h2>
                <p className="text-xs tabular-nums text-muted-foreground">
                  +{formatNumber(g.total)}
                </p>
              </div>
              <ul className="space-y-2">
                {g.entries.map((e) => (
                  <li key={e.id} className="clay-list-row rounded-2xl border border-border/40 bg-card/70 px-1">
                    <EntryItem entry={e} tracker={trackerMap.get(e.trackerId)} />
                  </li>
                ))}
              </ul>
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
      // Larger comfortable touch target (~40 px) + `.clay-chip` for the
      // raised pigmented tile look under Clay. Selected state is
      // signalled with brand-tinted fill + weight, never color alone.
      data-active={active ? "true" : undefined}
      className={cn(
        "clay-chip shrink-0 snap-start rounded-full border px-4 py-2 text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-foreground/20 bg-foreground text-background shadow-sm"
          : "border-border/60 bg-transparent text-muted-foreground hover:bg-muted/40",
      )}
    >
      {children}
    </button>
  );
}
