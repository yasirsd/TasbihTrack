import { describe, expect, it } from "vitest";
import type { ProgressEntry, Tracker } from "@/lib/data/types";
import { computeTrackerStats, groupByDay, last7DayPoints, shiftDayKey } from "./progress";
import { todayKey } from "@/lib/date-utils";
import { parseBackup } from "@/lib/backup/backup";

const tracker: Tracker = {
  id: "t1",
  userId: "u1",
  name: "Durood Shareef",
  targetCount: 100000,
  status: "active",
  sortOrder: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function entry(amount: number, entryDate: string, id = Math.random().toString()): ProgressEntry {
  return {
    id,
    userId: "u1",
    trackerId: "t1",
    amount,
    entryDate,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("computeTrackerStats", () => {
  it("computes totals, remaining, percent", () => {
    const today = todayKey();
    const yesterday = shiftDayKey(today, -1);
    const s = computeTrackerStats(tracker, [
      entry(1000, today, "a"),
      entry(500, today, "b"),
      entry(2000, yesterday, "c"),
    ]);
    expect(s.total).toBe(3500);
    expect(s.remaining).toBe(96500);
    expect(s.percent).toBeCloseTo(3.5, 3);
    expect(s.today).toBe(1500);
    expect(s.isCompleted).toBe(false);
  });

  it("clamps percent when overshooting", () => {
    const today = todayKey();
    const s = computeTrackerStats(
      { ...tracker, targetCount: 1000 },
      [entry(1500, today)],
    );
    expect(s.percent).toBe(100);
    expect(s.remaining).toBe(0);
    expect(s.isCompleted).toBe(true);
  });

  it("handles zero target gracefully", () => {
    const s = computeTrackerStats({ ...tracker, targetCount: 0 }, []);
    expect(s.percent).toBe(0);
    expect(s.remaining).toBe(0);
    expect(s.isCompleted).toBe(false);
  });

  it("computes required per day when target date is set", () => {
    const today = todayKey();
    const future = shiftDayKey(today, 10);
    const s = computeTrackerStats(
      { ...tracker, targetCount: 1000, targetDate: future },
      [entry(500, today)],
    );
    expect(s.daysRemaining).toBe(10);
    expect(s.requiredPerDay).toBe(50);
  });
});

describe("groupByDay", () => {
  it("groups entries by date descending", () => {
    const a = shiftDayKey(todayKey(), -1);
    const b = todayKey();
    const groups = groupByDay([entry(100, a, "1"), entry(50, b, "2")]);
    expect(groups[0].key).toBe(b);
    expect(groups[1].key).toBe(a);
    expect(groups[0].total).toBe(50);
  });
});

describe("last7DayPoints", () => {
  it("returns 7 sequential day buckets", () => {
    const points = last7DayPoints([entry(10, todayKey())]);
    expect(points).toHaveLength(7);
    expect(points[6].amount).toBe(10);
  });
});

describe("backup parser", () => {
  it("rejects invalid data", () => {
    const result = parseBackup({ not: "valid" });
    expect(result.ok).toBe(false);
  });
});
