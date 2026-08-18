import { describe, expect, it } from "vitest";
import type { ProgressEntry, Tracker } from "@/lib/data/types";
import { computeTodayTarget } from "./today-target";
import { shiftDayKey, todayKey } from "@/lib/date-utils";

function makeTracker(over: Partial<Tracker> = {}): Tracker {
  return {
    id: "t1",
    userId: "u",
    name: "Durood",
    targetCount: 100000,
    status: "active",
    isPinned: false,
    sortOrder: 0,
    startedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}
function e(amount: number, date: string, trackerId = "t1", id = Math.random().toString()): ProgressEntry {
  return {
    id,
    userId: "u",
    trackerId,
    amount,
    entryDate: date,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const today = todayKey();
const yest = shiftDayKey(today, -1);

describe("computeTodayTarget — explicit daily target wins", () => {
  it("uses dailyTarget verbatim", () => {
    const t = makeTracker({ dailyTarget: 2000 });
    const s = computeTodayTarget(t, [e(1200, today)]);
    expect(s.source).toBe("daily-target");
    expect(s.target).toBe(2000);
    expect(s.todayCompleted).toBe(1200);
    expect(s.remainingToday).toBe(800);
    expect(s.reached).toBe(false);
  });

  it("marks reached when today's total meets the daily target", () => {
    const t = makeTracker({ dailyTarget: 1000 });
    const s = computeTodayTarget(t, [e(600, today), e(400, today)]);
    expect(s.reached).toBe(true);
    expect(s.remainingToday).toBe(0);
  });
});

describe("computeTodayTarget — deadline-derived pace is stable during the day", () => {
  it("computes ceil(remainingAtStartOfToday / daysRemainingInclusive)", () => {
    // Target 1000, 500 done before today, 10 inclusive days remaining
    // → 500/10 = 50/day today.
    const targetDate = shiftDayKey(today, 9); // today + 9 = 10 inclusive
    const t = makeTracker({ targetCount: 1000, targetDate });
    const s = computeTodayTarget(t, [e(500, yest)]);
    expect(s.source).toBe("pace");
    expect(s.target).toBe(50);
    expect(s.daysRemaining).toBe(10);
  });

  it("does NOT drift as the user logs more today", () => {
    const targetDate = shiftDayKey(today, 9);
    const t = makeTracker({ targetCount: 1000, targetDate });
    const before = computeTodayTarget(t, [e(500, yest)]);
    const after = computeTodayTarget(t, [e(500, yest), e(30, today)]);
    expect(after.target).toBe(before.target); // stable
    expect(after.todayCompleted).toBe(30);
    expect(after.remainingToday).toBe(before.target - 30);
  });

  it("target reached before today → today target becomes 0", () => {
    const targetDate = shiftDayKey(today, 5);
    const t = makeTracker({ targetCount: 100, targetDate });
    const s = computeTodayTarget(t, [e(100, yest)]);
    expect(s.target).toBe(0);
    expect(s.reached).toBe(true);
  });

  it("target date today (inclusive) → daysRemaining 1", () => {
    const t = makeTracker({ targetCount: 100, targetDate: today });
    const s = computeTodayTarget(t, []);
    expect(s.daysRemaining).toBe(1);
    expect(s.target).toBe(100);
  });
});

describe("computeTodayTarget — no signal", () => {
  it("returns source=none with target=0 when neither dailyTarget nor targetDate exists", () => {
    const t = makeTracker();
    const s = computeTodayTarget(t, [e(100, today)]);
    expect(s.source).toBe("none");
    expect(s.target).toBe(0);
    expect(s.todayCompleted).toBe(100);
  });
});
