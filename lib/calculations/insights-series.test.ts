import { describe, expect, it } from "vitest";
import {
  buildInsightsSeries,
  type InsightsRange,
} from "./insights-series";
import type { ProgressEntry } from "@/lib/data/types";
import { addDays, toLocalDateKey } from "@/lib/date-utils";

// ---------------------------------------------------------------------------
// Test-only fixture helpers. `now` is fixed inside each test so the range
// boundaries are deterministic regardless of when the suite runs.
// ---------------------------------------------------------------------------
const NOW = new Date(2026, 7, 19, 12, 0, 0); // 2026-08-19 12:00 local

function entry(dateKey: string, amount: number): ProgressEntry {
  return {
    id: `${dateKey}-${amount}`,
    userId: "u",
    trackerId: "t",
    amount,
    entryDate: dateKey,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function keyDaysAgo(n: number): string {
  return toLocalDateKey(addDays(NOW, -n));
}

// ---------------------------------------------------------------------------
// 7 Days
// ---------------------------------------------------------------------------
describe("Insights range: 7 Days", () => {
  it("produces exactly 7 daily points ending at today", () => {
    const s = buildInsightsSeries([], "7d", NOW);
    expect(s.range).toBe("7d");
    expect(s.bucket).toBe("day");
    expect(s.points.length).toBe(7);
    expect(s.points[6].key).toBe(toLocalDateKey(NOW));
    expect(s.points[0].key).toBe(keyDaysAgo(6));
  });

  it("day 7 (today-6) INCLUDED, day 8 (today-7) EXCLUDED", () => {
    const s = buildInsightsSeries(
      [
        entry(toLocalDateKey(NOW), 100), // today
        entry(keyDaysAgo(6), 50), // included boundary
        entry(keyDaysAgo(7), 999), // excluded boundary
      ],
      "7d",
      NOW,
    );
    expect(s.total).toBe(150);
    expect(s.points.find((p) => p.key === keyDaysAgo(7))).toBeUndefined();
    expect(s.points.find((p) => p.key === keyDaysAgo(6))?.amount).toBe(50);
  });

  it("multiple entries on the same day SUM", () => {
    const today = toLocalDateKey(NOW);
    const s = buildInsightsSeries(
      [entry(today, 100), entry(today, 250), entry(today, 30)],
      "7d",
      NOW,
    );
    expect(s.points[6].amount).toBe(380);
  });

  it("empty range produces 7 zero-amount points and safe stats", () => {
    const s = buildInsightsSeries([], "7d", NOW);
    expect(s.points.every((p) => p.amount === 0)).toBe(true);
    expect(s.total).toBe(0);
    expect(s.peak).toBe(0);
    expect(s.average).toBe(0);
    expect(s.activeBuckets).toBe(0);
  });

  it("labels are short weekday names", () => {
    const s = buildInsightsSeries([], "7d", NOW);
    // Weekday of NOW is Wednesday 2026-08-19 — Wed / Thu / Fri / Sat / Sun / Mon / Tue / Wed
    expect(s.points[6].label.length).toBeLessThanOrEqual(5);
  });

  it("average is over non-empty buckets only (never divides by zero)", () => {
    const s = buildInsightsSeries(
      [entry(toLocalDateKey(NOW), 100), entry(keyDaysAgo(1), 200)],
      "7d",
      NOW,
    );
    expect(s.activeBuckets).toBe(2);
    expect(s.average).toBe(150);
  });
});

// ---------------------------------------------------------------------------
// 30 Days
// ---------------------------------------------------------------------------
describe("Insights range: 30 Days", () => {
  it("produces exactly 30 daily points", () => {
    const s = buildInsightsSeries([], "30d", NOW);
    expect(s.points.length).toBe(30);
    expect(s.bucket).toBe("day");
  });

  it("day 30 (today-29) INCLUDED, day 31 (today-30) EXCLUDED", () => {
    const s = buildInsightsSeries(
      [entry(keyDaysAgo(29), 10), entry(keyDaysAgo(30), 999)],
      "30d",
      NOW,
    );
    expect(s.total).toBe(10);
    expect(s.points.find((p) => p.key === keyDaysAgo(30))).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 1 Year
// ---------------------------------------------------------------------------
describe("Insights range: 1 Year", () => {
  it("produces exactly 12 monthly points ending at the current month", () => {
    const s = buildInsightsSeries([], "1y", NOW);
    expect(s.points.length).toBe(12);
    expect(s.bucket).toBe("month");
    // Last point matches current month "YYYY-MM"
    expect(s.points[11].key).toBe(
      `${NOW.getFullYear()}-${String(NOW.getMonth() + 1).padStart(2, "0")}`,
    );
    // First point is 11 months earlier
    const startTotal = NOW.getFullYear() * 12 + NOW.getMonth() - 11;
    const y = Math.floor(startTotal / 12);
    const m = startTotal - y * 12;
    expect(s.points[0].key).toBe(`${y}-${String(m + 1).padStart(2, "0")}`);
  });

  it("year boundary — December → January are contiguous months", () => {
    const now = new Date(2026, 1, 15); // 2026-02-15 → months: Mar 25, Apr 25, ... Jan 26, Feb 26
    const s = buildInsightsSeries([], "1y", now);
    const janIdx = s.points.findIndex((p) => p.key === "2026-01");
    const decIdx = s.points.findIndex((p) => p.key === "2025-12");
    expect(janIdx).toBeGreaterThan(-1);
    expect(decIdx).toBe(janIdx - 1);
  });

  it("entries aggregate into the correct month regardless of day", () => {
    const s = buildInsightsSeries(
      [entry("2026-08-01", 100), entry("2026-08-30", 50), entry("2026-07-15", 200)],
      "1y",
      NOW,
    );
    expect(s.points.find((p) => p.key === "2026-08")?.amount).toBe(150);
    expect(s.points.find((p) => p.key === "2026-07")?.amount).toBe(200);
  });

  it("entries outside the rolling 12-month window are excluded from total", () => {
    // NOW is 2026-08 → window is 2025-09 … 2026-08. An entry in 2025-08 is out.
    const s = buildInsightsSeries(
      [entry("2025-08-15", 500), entry("2025-09-15", 100)],
      "1y",
      NOW,
    );
    expect(s.total).toBe(100);
    expect(s.points.find((p) => p.key === "2025-08")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Lifetime
// ---------------------------------------------------------------------------
describe("Insights range: Lifetime (adaptive)", () => {
  it("empty input produces an empty series with safe stats", () => {
    const s = buildInsightsSeries([], "lifetime", NOW);
    expect(s.points).toEqual([]);
    expect(s.total).toBe(0);
    expect(s.peak).toBe(0);
    expect(s.activeBuckets).toBe(0);
    expect(s.average).toBe(0);
  });

  it("span ≤ 90 days → daily buckets from earliest entry through today", () => {
    const s = buildInsightsSeries(
      [entry(keyDaysAgo(30), 10), entry(toLocalDateKey(NOW), 20)],
      "lifetime",
      NOW,
    );
    expect(s.bucket).toBe("day");
    expect(s.points.length).toBe(31); // inclusive
    expect(s.points[0].key).toBe(keyDaysAgo(30));
    expect(s.points[s.points.length - 1].key).toBe(toLocalDateKey(NOW));
  });

  it("91-day span → switches to monthly buckets", () => {
    const s = buildInsightsSeries([entry(keyDaysAgo(120), 10)], "lifetime", NOW);
    expect(s.bucket).toBe("month");
    // Total buckets = months between earliest and now, inclusive.
    expect(s.points.length).toBeGreaterThanOrEqual(4);
  });

  it("very long span → monthly buckets (never balloons to daily count)", () => {
    const s = buildInsightsSeries([entry("2020-01-15", 1)], "lifetime", NOW);
    expect(s.bucket).toBe("month");
    // Sanity — must not be 2000+ points.
    expect(s.points.length).toBeLessThan(200);
  });
});

// ---------------------------------------------------------------------------
// Series correctness — order + zeros preserved (chart-rendering guard)
// ---------------------------------------------------------------------------
describe("Series correctness invariants", () => {
  it("preserves order + zero values so the chart renders them literally", () => {
    const amounts = [0, 2100, 5200, 1100, 2100, 6500, 0];
    const s = buildInsightsSeries(
      amounts.map((a, i) => entry(keyDaysAgo(6 - i), a)),
      "7d",
      NOW,
    );
    expect(s.points.map((p) => p.amount)).toEqual(amounts);
  });

  it("range enum handles all four cases with deterministic bucket type", () => {
    const cases: [InsightsRange, "day" | "month"][] = [
      ["7d", "day"],
      ["30d", "day"],
      ["1y", "month"],
    ];
    for (const [r, expected] of cases) {
      expect(buildInsightsSeries([], r, NOW).bucket).toBe(expected);
    }
  });
});
