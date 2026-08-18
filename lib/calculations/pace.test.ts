import { describe, expect, it } from "vitest";
import type { ProgressEntry, Tracker } from "@/lib/data/types";
import {
  computePace,
  currentStreakDays,
  smartQuickAmounts,
  weeklyComparison,
} from "./pace";
import { todayKey, shiftDayKey } from "@/lib/date-utils";

function e(amount: number, entryDate: string, id = Math.random().toString()): ProgressEntry {
  return {
    id,
    userId: "u",
    trackerId: "t1",
    amount,
    entryDate,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const baseTracker: Tracker = {
  id: "t1",
  userId: "u",
  name: "T",
  targetCount: 1000,
  status: "active",
  isPinned: false,
  sortOrder: 0,
  startedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("computePace", () => {
  it("returns no_data when there is no activity and no target date", () => {
    const p = computePace(baseTracker, []);
    expect(p.status).toBe("no_data");
    expect(p.requiredPerDay).toBeNull();
  });

  it("computes required-per-day when target date is set", () => {
    const today = todayKey();
    const future = shiftDayKey(today, 10);
    const tracker: Tracker = { ...baseTracker, targetDate: future, startedAt: today };
    const p = computePace(tracker, [e(200, today)]);
    expect(p.requiredPerDay).toBe(80);
  });

  it("marks completed goals as completed", () => {
    const today = todayKey();
    const p = computePace(baseTracker, [e(1000, today)]);
    expect(p.status).toBe("completed");
  });

  it("returns behind when below expected pace", () => {
    const today = todayKey();
    const started = shiftDayKey(today, -10);
    const future = shiftDayKey(today, 10);
    const tracker: Tracker = {
      ...baseTracker,
      startedAt: started,
      targetDate: future,
      targetCount: 2000,
    };
    // expected ~1000 by now, but total is 100 → behind
    const p = computePace(tracker, [e(100, today)]);
    expect(p.status).toBe("behind");
    expect(p.diffFromTarget).toBeLessThan(0);
  });
});

describe("currentStreakDays", () => {
  it("counts today + yesterday as 2-day streak", () => {
    const today = todayKey();
    const yest = shiftDayKey(today, -1);
    expect(currentStreakDays([e(1, today), e(1, yest)])).toBe(2);
  });
  it("allows starting from yesterday if today has no entry", () => {
    const today = todayKey();
    const yest = shiftDayKey(today, -1);
    const dayBefore = shiftDayKey(today, -2);
    expect(currentStreakDays([e(1, yest), e(1, dayBefore)])).toBe(2);
  });
  it("is 0 when there is no recent activity", () => {
    expect(currentStreakDays([])).toBe(0);
  });
});

describe("weeklyComparison", () => {
  it("returns diff when both weeks have entries", () => {
    const today = todayKey();
    const eightDaysAgo = shiftDayKey(today, -8);
    const w = weeklyComparison([e(200, today), e(100, eightDaysAgo)]);
    expect(w.thisWeek).toBe(200);
    expect(w.lastWeek).toBe(100);
    expect(w.diffPercent).toBe(100);
  });
});

describe("smartQuickAmounts", () => {
  it("returns defaults for empty history", () => {
    expect(smartQuickAmounts([])).toEqual([33, 100, 500, 1000]);
  });
  it("promotes frequently used amounts", () => {
    const today = todayKey();
    const list: ProgressEntry[] = [];
    for (let i = 0; i < 5; i++) list.push(e(500, today, String(i)));
    const out = smartQuickAmounts(list);
    expect(out).toContain(500);
  });
});
