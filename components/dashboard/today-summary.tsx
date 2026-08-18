"use client";
import { motion } from "motion/react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { formatNumber } from "@/lib/format";
import { todayKey } from "@/lib/date-utils";
import type { ProgressEntry, Tracker } from "@/lib/data/types";

/**
 * Trimmed to a typography-first surface: no heavy glass card, no glow blobs.
 * Hierarchy comes from the large number and its short caption, not from a
 * decorated container. Sits between the greeting and the goal list.
 */
export function TodaySummary({
  entries,
  trackers,
}: {
  entries: ProgressEntry[];
  trackers: Tracker[];
}) {
  const today = todayKey();
  const todaysEntries = entries.filter((e) => e.entryDate === today);
  const total = todaysEntries.reduce((a, b) => a + b.amount, 0);
  const goalCount = new Set(todaysEntries.map((e) => e.trackerId)).size;
  const activeGoals = trackers.filter((t) => t.status === "active").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="px-1"
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Today
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="hero-number text-5xl font-semibold sm:text-6xl">
          <AnimatedNumber value={total} />
        </span>
        <span className="text-sm text-muted-foreground">recitations</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {total === 0
          ? activeGoals > 0
            ? "Add your first entry for today when you're ready."
            : "Create a goal to begin tracking."
          : `across ${goalCount} of ${activeGoals} ${activeGoals === 1 ? "goal" : "goals"}`}
      </p>
    </motion.div>
  );
}

export function formatTodayTotals(entries: ProgressEntry[]): string {
  const total = entries
    .filter((e) => e.entryDate === todayKey())
    .reduce((a, b) => a + b.amount, 0);
  return formatNumber(total);
}
