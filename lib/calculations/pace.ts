import type { ProgressEntry, Tracker } from "@/lib/data/types";
import { addDays, daysBetween, parseDateKey, todayKey, toLocalDateKey } from "@/lib/date-utils";

export interface PaceInfo {
  requiredPerDay: number | null;
  recentAveragePerDay: number | null;
  estimatedCompletionKey: string | null;
  status: "on_track" | "ahead" | "behind" | "completed" | "no_target_date" | "no_data";
  diffFromTarget: number | null; // signed: + ahead, - behind
}

const RECENT_WINDOW_DAYS = 14;

export function computePace(tracker: Tracker, entries: ProgressEntry[]): PaceInfo {
  const own = entries.filter((e) => e.trackerId === tracker.id);
  const total = own.reduce((a, b) => a + b.amount, 0);
  const target = tracker.targetCount;
  const remaining = Math.max(0, target - total);

  if (total >= target && target > 0) {
    return {
      requiredPerDay: 0,
      recentAveragePerDay: null,
      estimatedCompletionKey: null,
      status: "completed",
      diffFromTarget: null,
    };
  }

  const recentAverage = recentAveragePerActiveDay(own, RECENT_WINDOW_DAYS);

  let requiredPerDay: number | null = null;
  let status: PaceInfo["status"] = "no_target_date";
  let diffFromTarget: number | null = null;
  let estimatedCompletionKey: string | null = null;

  if (tracker.targetDate) {
    const daysRemaining = Math.max(0, daysBetween(todayKey(), tracker.targetDate));
    if (daysRemaining === 0) {
      requiredPerDay = remaining;
    } else {
      requiredPerDay = Math.ceil(remaining / daysRemaining);
    }

    // Ahead/behind vs expected pace given elapsed calendar days.
    const startedKey = tracker.startedAt ? toLocalDateKey(tracker.startedAt) : null;
    if (startedKey) {
      const totalPlan = Math.max(1, daysBetween(startedKey, tracker.targetDate));
      const elapsed = Math.min(totalPlan, Math.max(0, daysBetween(startedKey, todayKey())));
      const expected = Math.round((target * elapsed) / totalPlan);
      diffFromTarget = total - expected;
      if (Math.abs(diffFromTarget) < Math.max(50, expected * 0.02)) status = "on_track";
      else if (diffFromTarget > 0) status = "ahead";
      else status = "behind";
    } else {
      status = "on_track";
    }
  }

  if (recentAverage && recentAverage > 0 && remaining > 0) {
    const daysToFinish = Math.ceil(remaining / recentAverage);
    estimatedCompletionKey = toLocalDateKey(addDays(parseDateKey(todayKey()), daysToFinish));
  } else if (recentAverage === null) {
    if (status === "no_target_date") status = "no_data";
  }

  return {
    requiredPerDay,
    recentAveragePerDay: recentAverage,
    estimatedCompletionKey,
    status,
    diffFromTarget,
  };
}

export function recentAveragePerActiveDay(
  entries: ProgressEntry[],
  windowDays = RECENT_WINDOW_DAYS,
): number | null {
  const cutoff = toLocalDateKey(addDays(parseDateKey(todayKey()), -(windowDays - 1)));
  const buckets = new Map<string, number>();
  for (const e of entries) {
    if (e.entryDate < cutoff) continue;
    buckets.set(e.entryDate, (buckets.get(e.entryDate) ?? 0) + e.amount);
  }
  if (buckets.size === 0) return null;
  let sum = 0;
  for (const v of buckets.values()) sum += v;
  return sum / buckets.size;
}

export function currentStreakDays(entries: ProgressEntry[]): number {
  if (entries.length === 0) return 0;
  const days = new Set(entries.map((e) => e.entryDate));
  let streak = 0;
  let cursor = parseDateKey(todayKey());
  // Allow starting streak from yesterday if today has no entry yet.
  if (!days.has(toLocalDateKey(cursor))) cursor = addDays(cursor, -1);
  while (days.has(toLocalDateKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export interface WeeklyComparison {
  thisWeek: number;
  lastWeek: number;
  diffPercent: number | null;
}

export function weeklyComparison(entries: ProgressEntry[]): WeeklyComparison {
  const today = parseDateKey(todayKey());
  const dayOfWeek = today.getDay();
  const startOfThisWeek = addDays(today, -dayOfWeek);
  const startOfLastWeek = addDays(startOfThisWeek, -7);
  const endOfLastWeek = addDays(startOfThisWeek, -1);
  let thisWeek = 0;
  let lastWeek = 0;
  for (const e of entries) {
    const d = parseDateKey(e.entryDate);
    if (d >= startOfThisWeek && d <= today) thisWeek += e.amount;
    else if (d >= startOfLastWeek && d <= endOfLastWeek) lastWeek += e.amount;
  }
  const diffPercent = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : null;
  return { thisWeek, lastWeek, diffPercent };
}

/** Smart quick-add: pick 3-4 clean amounts from tracker history + defaults. */
export function smartQuickAmounts(entries: ProgressEntry[]): number[] {
  const DEFAULTS = [33, 100, 500, 1000];
  if (entries.length === 0) return DEFAULTS;
  const freq = new Map<number, number>();
  for (const e of entries.slice(0, 40)) {
    const rounded = niceRound(e.amount);
    freq.set(rounded, (freq.get(rounded) ?? 0) + 1);
  }
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  const preferred = sorted.map(([n]) => n).filter((n) => n > 0);
  const merged = [...new Set([...preferred, ...DEFAULTS])];
  return merged.slice(0, 4).sort((a, b) => a - b);
}

function niceRound(n: number): number {
  if (n <= 33) return 33;
  if (n <= 100) return 100;
  if (n <= 500) return 500;
  if (n <= 1000) return 1000;
  if (n <= 2500) return 2500;
  if (n <= 5000) return 5000;
  return Math.round(n / 1000) * 1000;
}
