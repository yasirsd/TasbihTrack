"use client";
import * as React from "react";
import { motion } from "motion/react";
import type { ProgressEntry, Tracker } from "@/lib/data/types";
import { EntryItem } from "@/components/entries/entry-item";
import { formatLongDate } from "@/lib/date-utils";
import { formatNumber } from "@/lib/format";

interface DayDetailsProps {
  dateKey: string;
  entries: ProgressEntry[];
  trackers: Tracker[];
  /**
   * "tracker" = entries all belong to the same tracker; skip per-tracker grouping.
   * "history" = entries may span trackers; group by tracker when the caller
   * hasn't filtered to a single one.
   */
  variant: "tracker" | "history";
}

/**
 * The panel that appears below the calendar when a day is selected. Rendered
 * inline (not a modal) as the spec requires.
 */
export function CalendarDayDetails({ dateKey, entries, trackers, variant }: DayDetailsProps) {
  const dayEntries = React.useMemo(
    () => entries.filter((e) => e.entryDate === dateKey),
    [entries, dateKey],
  );
  const total = React.useMemo(
    () => dayEntries.reduce((a, b) => a + b.amount, 0),
    [dayEntries],
  );
  const trackerMap = React.useMemo(
    () => new Map(trackers.map((t) => [t.id, t])),
    [trackers],
  );

  // History with multiple trackers → group.
  const groups = React.useMemo(() => {
    if (variant === "tracker") return null;
    const trackerIds = new Set(dayEntries.map((e) => e.trackerId));
    if (trackerIds.size <= 1) return null;
    const byTracker = new Map<string, ProgressEntry[]>();
    for (const e of dayEntries) {
      const arr = byTracker.get(e.trackerId);
      if (arr) arr.push(e);
      else byTracker.set(e.trackerId, [e]);
    }
    return [...byTracker.entries()]
      .map(([id, list]) => ({
        tracker: trackerMap.get(id),
        entries: list,
        total: list.reduce((a, b) => a + b.amount, 0),
      }))
      .sort((a, b) => b.total - a.total);
  }, [dayEntries, trackerMap, variant]);

  return (
    <motion.section
      key={dateKey}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="mt-4 space-y-3"
      aria-live="polite"
    >
      <header className="flex items-baseline justify-between px-1">
        <h3 className="text-sm font-medium">{formatLongDate(dateKey)}</h3>
        {total > 0 && (
          <p className="text-xs tabular-nums text-muted-foreground">
            {formatNumber(total)} recorded
          </p>
        )}
      </header>

      {dayEntries.length === 0 ? (
        <p className="px-1 text-xs text-muted-foreground">No progress recorded.</p>
      ) : groups ? (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.tracker?.id ?? "unknown"} className="clay-row rounded-2xl border border-border/60 bg-card/60 p-3">
              <div className="mb-1 flex items-baseline justify-between px-1">
                <p className="text-sm font-medium">{g.tracker?.name ?? "Unknown goal"}</p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  +{formatNumber(g.total)}
                </p>
              </div>
              <div className="space-y-1">
                {g.entries.map((e) => (
                  <EntryItem key={e.id} entry={e} tracker={g.tracker} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="clay-row rounded-2xl border border-border/60 bg-card/60 p-2">
          {dayEntries.map((e) => (
            <EntryItem key={e.id} entry={e} tracker={trackerMap.get(e.trackerId)} />
          ))}
        </div>
      )}
    </motion.section>
  );
}
