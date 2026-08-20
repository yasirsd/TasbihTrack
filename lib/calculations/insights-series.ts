// Phase 7 — Insights series aggregation.
//
// One deterministic entry point that turns raw progress entries into a
// display-ready time series for any of the four Insights ranges:
//
//   • 7d       — last 7 local calendar days, DAILY buckets       (7 points)
//   • 30d      — last 30 local calendar days, DAILY buckets      (30 points)
//   • 1y       — rolling last 12 local months, MONTHLY buckets   (12 points)
//   • lifetime — earliest entry → today, adaptive aggregation
//
// LIFETIME AGGREGATION RULE (documented per PROMPT 7 §"LIFETIME"):
//   span ≤ 90 days                → DAILY buckets
//   90 days < span ≤ 730 days     → MONTHLY buckets
//   span > 730 days               → MONTHLY buckets (sparse X labels
//                                   handled at render time)
//
// Every bucket comes from a LOCAL calendar boundary — the existing
// `todayKey` / `toLocalDateKey` helpers are the source of truth so
// there is no UTC midnight drift.

import type { ProgressEntry } from "@/lib/data/types";
import {
  addDays,
  parseDateKey,
  todayKey,
  toLocalDateKey,
} from "@/lib/date-utils";

export type InsightsRange = "7d" | "30d" | "1y" | "lifetime";

export type SeriesBucket = "day" | "month";

export interface InsightsPoint {
  /** Canonical bucket key — YYYY-MM-DD for day, YYYY-MM for month. */
  key: string;
  /** Sum of amounts inside the bucket. Zero when the bucket is empty. */
  amount: number;
  /** Human-facing label. Short enough for a mobile X axis. */
  label: string;
  /**
   * Longer label used in the tap tooltip. `"Aug 19"` for a day,
   * `"August 2026"` for a month.
   */
  tooltipLabel: string;
}

export interface InsightsSeries {
  range: InsightsRange;
  bucket: SeriesBucket;
  points: InsightsPoint[];
  total: number;
  peak: number;
  /** Non-zero bucket count — used for "active days" in the range summary. */
  activeBuckets: number;
  /**
   * Average per bucket across ALL buckets — including zero-value ones —
   * rounded to the nearest whole. Denominator is `points.length` so a
   * 7-day range divides by 7, a 1-year range by 12, and a lifetime
   * range by however many buckets it generated. This matches the
   * "Avg / Day" or "Avg / Month" reading the UI shows below the chart.
   */
  average: number;
}

const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTH_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function buildInsightsSeries(
  entries: readonly ProgressEntry[],
  range: InsightsRange,
  now: Date = new Date(),
): InsightsSeries {
  switch (range) {
    case "7d":
      return buildDailySeries(entries, now, 7, "7d");
    case "30d":
      return buildDailySeries(entries, now, 30, "30d");
    case "1y":
      return buildMonthlySeries(entries, now, 12, "1y");
    case "lifetime":
      return buildLifetimeSeries(entries, now);
  }
}

// ---------------------------------------------------------------------------
// Daily buckets
// ---------------------------------------------------------------------------

function buildDailySeries(
  entries: readonly ProgressEntry[],
  now: Date,
  windowDays: number,
  range: InsightsRange,
): InsightsSeries {
  const keys: string[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    keys.push(toLocalDateKey(addDays(now, -i)));
  }
  const map = new Map<string, number>();
  for (const e of entries) map.set(e.entryDate, (map.get(e.entryDate) ?? 0) + e.amount);

  const points: InsightsPoint[] = keys.map((k) => {
    const d = parseDateKey(k);
    return {
      key: k,
      amount: map.get(k) ?? 0,
      label: shortDayLabel(d),
      tooltipLabel: dayTooltipLabel(d, now),
    };
  });
  return finalize(points, "day", range);
}

function shortDayLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

function dayTooltipLabel(d: Date, now: Date): string {
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
  });
}

// ---------------------------------------------------------------------------
// Monthly buckets
// ---------------------------------------------------------------------------

function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function entryMonthKey(e: ProgressEntry): string {
  // entryDate is `YYYY-MM-DD`; slice to `YYYY-MM`.
  return e.entryDate.slice(0, 7);
}

function buildMonthlySeries(
  entries: readonly ProgressEntry[],
  now: Date,
  windowMonths: number,
  range: InsightsRange,
): InsightsSeries {
  // Rolling window of `windowMonths` months ending at the current month.
  const keys: { key: string; year: number; monthIndex: number }[] = [];
  const startYear = now.getFullYear();
  const startMonth = now.getMonth();
  for (let i = windowMonths - 1; i >= 0; i--) {
    const total = startYear * 12 + startMonth - i;
    const y = Math.floor(total / 12);
    const m = total - y * 12;
    keys.push({ key: monthKey(y, m), year: y, monthIndex: m });
  }
  const map = new Map<string, number>();
  for (const e of entries) {
    const k = entryMonthKey(e);
    map.set(k, (map.get(k) ?? 0) + e.amount);
  }
  const currentYear = now.getFullYear();
  const points: InsightsPoint[] = keys.map(({ key, year, monthIndex }) => {
    const sameYear = year === currentYear;
    return {
      key,
      amount: map.get(key) ?? 0,
      // e.g. "Aug"; short axis label.
      label: sameYear ? MONTH_ABBR[monthIndex] : `${MONTH_ABBR[monthIndex]} ${String(year).slice(2)}`,
      tooltipLabel: `${MONTH_FULL[monthIndex]} ${year}`,
    };
  });
  return finalize(points, "month", range);
}

// ---------------------------------------------------------------------------
// Lifetime — adaptive
// ---------------------------------------------------------------------------

function buildLifetimeSeries(
  entries: readonly ProgressEntry[],
  now: Date,
): InsightsSeries {
  if (entries.length === 0) {
    return {
      range: "lifetime",
      bucket: "day",
      points: [],
      total: 0,
      peak: 0,
      activeBuckets: 0,
      average: 0,
    };
  }
  const earliestKey = entries.reduce(
    (min, e) => (e.entryDate < min ? e.entryDate : min),
    entries[0].entryDate,
  );
  const earliest = parseDateKey(earliestKey);
  const spanDays = Math.floor((now.getTime() - earliest.getTime()) / 86_400_000) + 1;
  if (spanDays <= 90) {
    // Daily buckets from earliest to today.
    const days: string[] = [];
    for (let d = new Date(earliest); d <= now; d = addDays(d, 1)) {
      days.push(toLocalDateKey(d));
    }
    const map = new Map<string, number>();
    for (const e of entries) map.set(e.entryDate, (map.get(e.entryDate) ?? 0) + e.amount);
    const points: InsightsPoint[] = days.map((k) => {
      const d = parseDateKey(k);
      return {
        key: k,
        amount: map.get(k) ?? 0,
        label: shortDayLabel(d),
        tooltipLabel: dayTooltipLabel(d, now),
      };
    });
    return finalize(points, "day", "lifetime");
  }
  // Monthly buckets from earliest month to current month.
  const months: { key: string; year: number; monthIndex: number }[] = [];
  const earliestY = earliest.getFullYear();
  const earliestM = earliest.getMonth();
  const nowY = now.getFullYear();
  const nowM = now.getMonth();
  const startTotal = earliestY * 12 + earliestM;
  const endTotal = nowY * 12 + nowM;
  for (let t = startTotal; t <= endTotal; t++) {
    const y = Math.floor(t / 12);
    const m = t - y * 12;
    months.push({ key: monthKey(y, m), year: y, monthIndex: m });
  }
  const map = new Map<string, number>();
  for (const e of entries) {
    const k = entryMonthKey(e);
    map.set(k, (map.get(k) ?? 0) + e.amount);
  }
  const points: InsightsPoint[] = months.map(({ key, year, monthIndex }) => {
    const sameYear = year === nowY;
    return {
      key,
      amount: map.get(key) ?? 0,
      label: sameYear ? MONTH_ABBR[monthIndex] : `${MONTH_ABBR[monthIndex]} ${String(year).slice(2)}`,
      tooltipLabel: `${MONTH_FULL[monthIndex]} ${year}`,
    };
  });
  return finalize(points, "month", "lifetime");
}

// ---------------------------------------------------------------------------
// Series stats
// ---------------------------------------------------------------------------

function finalize(
  points: InsightsPoint[],
  bucket: SeriesBucket,
  range: InsightsRange,
): InsightsSeries {
  const total = points.reduce((a, p) => a + p.amount, 0);
  const peak = points.reduce((max, p) => (p.amount > max ? p.amount : max), 0);
  const activeBuckets = points.filter((p) => p.amount > 0).length;
  // Average is per-bucket including zero buckets — Phase 7.2 P0.3 semantics.
  // Empty-series case (points.length === 0) returns 0 without dividing.
  const average =
    points.length === 0 ? 0 : Math.round(total / points.length);
  return {
    range,
    bucket,
    points,
    total,
    peak,
    activeBuckets,
    average,
  };
}

// ---------------------------------------------------------------------------
// Range metadata for the UI
// ---------------------------------------------------------------------------

export const INSIGHTS_RANGE_LABELS: Record<InsightsRange, string> = {
  "7d": "7 Days",
  "30d": "30 Days",
  "1y": "1 Year",
  lifetime: "Lifetime",
};
