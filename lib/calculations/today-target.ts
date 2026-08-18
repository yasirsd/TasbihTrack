import type { ProgressEntry, Tracker } from "@/lib/data/types";
import { daysBetween, todayKey } from "@/lib/date-utils";

/**
 * Today's Target as a permanent surface, per the 4C addendum.
 *
 * Precedence:
 *   1. If the tracker has an explicit `dailyTarget`, use it verbatim.
 *   2. Else if the tracker has a `targetDate`, derive a *stable* daily amount
 *      from the progress that existed BEFORE today and the number of days
 *      remaining (today through targetDate inclusive). The base target does
 *      NOT drift downward or upward as the user logs more today.
 *   3. Else, source = "none" — the UI can prompt the user to set a target date.
 */
export type TodayTargetSource = "daily-target" | "pace" | "none";

export interface TodayTargetSnapshot {
  source: TodayTargetSource;
  target: number; // 0 when source === "none"
  todayCompleted: number;
  remainingToday: number;
  reached: boolean; // todayCompleted >= target (target > 0)
  daysRemaining: number | null; // inclusive of today; null when no target date
}

export function computeTodayTarget(
  tracker: Tracker,
  entries: ProgressEntry[],
  today: string = todayKey(),
): TodayTargetSnapshot {
  const ownEntries = entries.filter((e) => e.trackerId === tracker.id);
  const todayCompleted = sum(ownEntries.filter((e) => e.entryDate === today));

  // 1. Explicit daily target wins.
  if (tracker.dailyTarget && tracker.dailyTarget > 0) {
    const target = tracker.dailyTarget;
    const daysRemaining = tracker.targetDate ? computeDaysRemainingInclusive(today, tracker.targetDate) : null;
    return {
      source: "daily-target",
      target,
      todayCompleted,
      remainingToday: Math.max(0, target - todayCompleted),
      reached: todayCompleted >= target,
      daysRemaining,
    };
  }

  // 2. Deadline-derived pace.
  if (tracker.targetDate) {
    const totalBeforeToday = sum(ownEntries.filter((e) => e.entryDate < today));
    const remainingAtStartOfToday = Math.max(0, tracker.targetCount - totalBeforeToday);
    const daysRemaining = computeDaysRemainingInclusive(today, tracker.targetDate);

    if (remainingAtStartOfToday === 0 || daysRemaining <= 0) {
      // Goal already reached before today, or deadline has passed.
      const overdueTarget = daysRemaining <= 0 ? remainingAtStartOfToday : 0;
      return {
        source: "pace",
        target: overdueTarget,
        todayCompleted,
        remainingToday: Math.max(0, overdueTarget - todayCompleted),
        reached: overdueTarget === 0 || todayCompleted >= overdueTarget,
        daysRemaining,
      };
    }
    const target = Math.ceil(remainingAtStartOfToday / daysRemaining);
    return {
      source: "pace",
      target,
      todayCompleted,
      remainingToday: Math.max(0, target - todayCompleted),
      reached: todayCompleted >= target,
      daysRemaining,
    };
  }

  // 3. No signal.
  return {
    source: "none",
    target: 0,
    todayCompleted,
    remainingToday: 0,
    reached: false,
    daysRemaining: null,
  };
}

function sum(entries: ProgressEntry[]): number {
  let total = 0;
  for (const e of entries) total += Math.max(0, e.amount || 0);
  return total;
}

/**
 * Days from today through targetDate INCLUSIVE. Both are date keys
 * (YYYY-MM-DD). If targetDate < today, returns 0 (deadline passed).
 */
function computeDaysRemainingInclusive(todayKey: string, targetKey: string): number {
  const diff = daysBetween(todayKey, targetKey);
  return diff < 0 ? 0 : diff + 1;
}
