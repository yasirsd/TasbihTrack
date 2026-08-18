export const MILESTONE_PERCENTS = [10, 25, 50, 75, 90, 100] as const;

/**
 * Returns milestone thresholds crossed when total moves from `prevTotal` to `nextTotal`.
 * Never returns a threshold that was already crossed before.
 */
export function crossedMilestones(
  prevTotal: number,
  nextTotal: number,
  target: number,
): number[] {
  if (target <= 0) return [];
  if (nextTotal <= prevTotal) return [];
  const prevPct = (prevTotal / target) * 100;
  const nextPct = (nextTotal / target) * 100;
  return MILESTONE_PERCENTS.filter((p) => prevPct < p && nextPct >= p);
}
