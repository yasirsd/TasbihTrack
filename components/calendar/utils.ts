import type { ProgressEntry } from "@/lib/data/types";
import { toLocalDateKey } from "@/lib/date-utils";

export type ActivityIntensity = "none" | "low" | "medium" | "high";

export interface DayActivity {
  dateKey: string;
  total: number;
  entryCount: number;
  trackerCount: number;
  intensity: ActivityIntensity;
}

export type ActivityMap = Map<string, DayActivity>;

/**
 * Build an activity map for the given entries. Intensity is bucketed
 * relative to the max amount seen in the entries (per the caller — callers
 * that want per-month intensity should pre-filter entries to that month).
 *
 * O(entries) — computed once via useMemo at the consumer level.
 */
export function buildActivityMap(entries: ProgressEntry[]): ActivityMap {
  const totals = new Map<string, { total: number; entryCount: number; trackers: Set<string> }>();
  for (const e of entries) {
    const key = e.entryDate;
    const existing = totals.get(key);
    if (existing) {
      existing.total += e.amount;
      existing.entryCount += 1;
      existing.trackers.add(e.trackerId);
    } else {
      totals.set(key, { total: e.amount, entryCount: 1, trackers: new Set([e.trackerId]) });
    }
  }
  let max = 0;
  for (const v of totals.values()) if (v.total > max) max = v.total;

  const map: ActivityMap = new Map();
  for (const [key, v] of totals.entries()) {
    map.set(key, {
      dateKey: key,
      total: v.total,
      entryCount: v.entryCount,
      trackerCount: v.trackers.size,
      intensity: intensityFor(v.total, max),
    });
  }
  return map;
}

export function intensityFor(total: number, max: number): ActivityIntensity {
  if (total <= 0 || max <= 0) return "none";
  const r = total / max;
  if (r <= 0.33) return "low";
  if (r <= 0.66) return "medium";
  return "high";
}

/**
 * Parse a date-key (YYYY-MM-DD) into a Date at local midnight without any
 * UTC shifting. Reuses TasbihTrack's existing convention that entry_date is
 * a local-day concept.
 */
export function parseLocalDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/**
 * Same as toLocalDateKey but re-exported for the calendar module's callers
 * to avoid deep imports.
 */
export function dateKey(date: Date): string {
  return toLocalDateKey(date);
}
