import type { ProgressEntry, Tracker } from "@/lib/data/types";
import {
  daysBetween,
  last7DaysKeys,
  startOfWeek,
  todayKey,
  toLocalDateKey,
} from "@/lib/date-utils";

export interface TrackerStats {
  total: number;
  remaining: number;
  percent: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  allTime: number;
  averagePerActiveDay: number;
  highestDay: { key: string; amount: number } | null;
  daysRemaining: number | null;
  requiredPerDay: number | null;
  isCompleted: boolean;
}

function sumAmount(entries: ProgressEntry[]): number {
  let total = 0;
  for (const e of entries) total += Math.max(0, e.amount || 0);
  return total;
}

export function totalForTracker(entries: ProgressEntry[], trackerId: string): number {
  return sumAmount(entries.filter((e) => e.trackerId === trackerId));
}

export function totalOnDay(entries: ProgressEntry[], dayKey: string, trackerId?: string): number {
  return sumAmount(
    entries.filter(
      (e) => e.entryDate === dayKey && (!trackerId || e.trackerId === trackerId),
    ),
  );
}

export function totalBetween(
  entries: ProgressEntry[],
  fromKey: string,
  toKey: string,
  trackerId?: string,
): number {
  return sumAmount(
    entries.filter(
      (e) =>
        e.entryDate >= fromKey &&
        e.entryDate <= toKey &&
        (!trackerId || e.trackerId === trackerId),
    ),
  );
}

export function computeTrackerStats(tracker: Tracker, entries: ProgressEntry[]): TrackerStats {
  const own = entries.filter((e) => e.trackerId === tracker.id);
  const total = sumAmount(own);
  const target = Math.max(0, tracker.targetCount || 0);
  const remaining = Math.max(0, target - total);
  const percent = target > 0 ? Math.min(100, (total / target) * 100) : 0;
  const today = todayKey();
  const week = startOfWeek(new Date());
  const weekKey = toLocalDateKey(week);
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthKey = toLocalDateKey(monthStart);
  const todaySum = totalOnDay(own, today);
  const thisWeek = totalBetween(own, weekKey, today);
  const thisMonth = totalBetween(own, monthKey, today);

  const daysActive = new Map<string, number>();
  for (const e of own) {
    daysActive.set(e.entryDate, (daysActive.get(e.entryDate) ?? 0) + e.amount);
  }
  const activeDayCount = daysActive.size || 1;
  const averagePerActiveDay = total / activeDayCount;
  let highest: { key: string; amount: number } | null = null;
  for (const [key, amount] of daysActive.entries()) {
    if (!highest || amount > highest.amount) highest = { key, amount };
  }

  let daysRemaining: number | null = null;
  let requiredPerDay: number | null = null;
  if (tracker.targetDate) {
    const diff = daysBetween(today, toLocalDateKey(tracker.targetDate));
    daysRemaining = Math.max(0, diff);
    if (remaining > 0 && daysRemaining > 0) {
      requiredPerDay = Math.ceil(remaining / daysRemaining);
    } else if (remaining > 0 && daysRemaining === 0) {
      requiredPerDay = remaining;
    } else {
      requiredPerDay = 0;
    }
  }

  return {
    total,
    remaining,
    percent,
    today: todaySum,
    thisWeek,
    thisMonth,
    allTime: total,
    averagePerActiveDay,
    highestDay: highest,
    daysRemaining,
    requiredPerDay,
    isCompleted: total >= target && target > 0,
  };
}

export interface DailyPoint {
  key: string;
  amount: number;
}

export function last7DayPoints(entries: ProgressEntry[], trackerId?: string): DailyPoint[] {
  const keys = last7DaysKeys();
  const map = new Map<string, number>();
  for (const e of entries) {
    if (trackerId && e.trackerId !== trackerId) continue;
    map.set(e.entryDate, (map.get(e.entryDate) ?? 0) + e.amount);
  }
  return keys.map((key) => ({ key, amount: map.get(key) ?? 0 }));
}

export interface DayGroup {
  key: string;
  entries: ProgressEntry[];
  total: number;
}

export function groupByDay(entries: ProgressEntry[]): DayGroup[] {
  const map = new Map<string, ProgressEntry[]>();
  for (const e of entries) {
    const list = map.get(e.entryDate);
    if (list) list.push(e);
    else map.set(e.entryDate, [e]);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, list]) => ({
      key,
      entries: [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
      total: sumAmount(list),
    }));
}

export function mostActiveTracker(
  trackers: Tracker[],
  entries: ProgressEntry[],
): { tracker: Tracker; total: number } | null {
  const totals = new Map<string, number>();
  for (const e of entries) totals.set(e.trackerId, (totals.get(e.trackerId) ?? 0) + e.amount);
  let best: { tracker: Tracker; total: number } | null = null;
  for (const t of trackers) {
    const total = totals.get(t.id) ?? 0;
    if (!best || total > best.total) best = { tracker: t, total };
  }
  return best && best.total > 0 ? best : null;
}

export function bestActivityDay(entries: ProgressEntry[]): { key: string; amount: number } | null {
  const map = new Map<string, number>();
  for (const e of entries) map.set(e.entryDate, (map.get(e.entryDate) ?? 0) + e.amount);
  let best: { key: string; amount: number } | null = null;
  for (const [key, amount] of map.entries()) {
    if (!best || amount > best.amount) best = { key, amount };
  }
  return best;
}

export function isEntryInWeek(entryKey: string): boolean {
  const weekStart = toLocalDateKey(startOfWeek(new Date()));
  const today = todayKey();
  return entryKey >= weekStart && entryKey <= today;
}

export { shiftDayKey } from "@/lib/date-utils";
