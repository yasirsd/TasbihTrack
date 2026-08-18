"use client";
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { formatLongDate, toLocalDateKey } from "@/lib/date-utils";
import type { ProgressEntry } from "@/lib/data/types";
import { EntryItem } from "@/components/entries/entry-item";
import { useData } from "@/components/data/data-context";

export function CalendarView({ trackerId }: { trackerId?: string }) {
  const { entries, trackers } = useData();
  const filtered = trackerId ? entries.filter((e) => e.trackerId === trackerId) : entries;
  const [cursor, setCursor] = React.useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selected, setSelected] = React.useState<string | null>(null);

  const dayTotals = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filtered) map.set(e.entryDate, (map.get(e.entryDate) ?? 0) + e.amount);
    return map;
  }, [filtered]);

  const daysMatrix = React.useMemo(() => buildMonthMatrix(cursor), [cursor]);
  const maxAmount = React.useMemo(
    () => Math.max(1, ...[...dayTotals.values()]),
    [dayTotals],
  );

  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const selectedEntries = React.useMemo(
    () => (selected ? filtered.filter((e) => e.entryDate === selected) : []),
    [selected, filtered],
  );
  const trackerMap = React.useMemo(() => new Map(trackers.map((t) => [t.id, t])), [trackers]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCursor(shiftMonth(cursor, -1))}
          className="rounded-full p-2 text-muted-foreground hover:bg-muted"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-medium">{monthLabel}</p>
        <button
          type="button"
          onClick={() => setCursor(shiftMonth(cursor, 1))}
          className="rounded-full p-2 text-muted-foreground hover:bg-muted"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {daysMatrix.map((d, i) => {
          if (!d) return <div key={i} aria-hidden />;
          const key = toLocalDateKey(d);
          const amount = dayTotals.get(key) ?? 0;
          const intensity = amount === 0 ? 0 : Math.min(1, amount / maxAmount);
          const isToday = key === toLocalDateKey(new Date());
          const isSelected = selected === key;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(isSelected ? null : key)}
              className={cn(
                "relative aspect-square rounded-lg text-[11px] font-medium transition-colors",
                amount === 0
                  ? "bg-muted/30 text-muted-foreground"
                  : "text-foreground",
                isToday && "ring-1 ring-crimson/60",
                isSelected && "ring-2 ring-foreground",
              )}
              style={
                amount > 0
                  ? {
                      backgroundColor: `hsl(354 88% 54% / ${0.15 + intensity * 0.55})`,
                    }
                  : undefined
              }
              aria-label={`${key}${amount > 0 ? ` — ${formatNumber(amount)} recitations` : " — no activity"}`}
            >
              <span className="absolute left-1 top-1">{d.getDate()}</span>
              {amount > 0 && (
                <span className="absolute inset-x-0 bottom-1 truncate px-1 text-[10px] tabular-nums opacity-90">
                  {formatNumber(amount)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="space-y-2 rounded-2xl border border-border/60 bg-card p-3">
          <p className="text-sm font-medium">{formatLongDate(selected)}</p>
          {selectedEntries.length === 0 ? (
            <p className="text-xs text-muted-foreground">No activity on this day.</p>
          ) : (
            selectedEntries.map((e: ProgressEntry) => (
              <EntryItem key={e.id} entry={e} tracker={trackerMap.get(e.trackerId)} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function buildMonthMatrix(monthStart: Date): (Date | null)[] {
  const first = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
  const daysInMonth = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0,
  ).getDate();
  const leading = first.getDay();
  const cells: (Date | null)[] = Array(leading).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function shiftMonth(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}
