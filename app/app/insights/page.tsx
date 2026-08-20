"use client";
import * as React from "react";
import { motion } from "motion/react";
import { useData } from "@/components/data/data-context";
import {
  bestActivityDay,
  computeTrackerStats,
  last7DayPoints,
  mostActiveTracker,
} from "@/lib/calculations/progress";
import { currentStreakDays, weeklyComparison } from "@/lib/calculations/pace";
import { formatCompact, formatNumber, formatPercent } from "@/lib/format";
import { formatShortDay, formatRelativeDate, todayKey } from "@/lib/date-utils";

export default function InsightsPage() {
  const { entries, trackers } = useData();
  const today = todayKey();
  const todayTotal = entries
    .filter((e) => e.entryDate === today)
    .reduce((a, b) => a + b.amount, 0);
  const points = last7DayPoints(entries);
  const weekTotal = points.reduce((a, b) => a + b.amount, 0);
  const allTime = entries.reduce((a, b) => a + b.amount, 0);
  const peak = points.reduce((max, p) => Math.max(max, p.amount), 0);
  const activeTrackers = trackers.filter(
    (t) => t.status !== "archived",
  );
  const bestGoal = mostActiveTracker(activeTrackers, entries);
  const bestDay = bestActivityDay(entries);
  const weekly = weeklyComparison(entries);
  // Streak is now always calculated (§60). We only surface it when it is
  // meaningful — hidden entirely at 0 to avoid guilt UX (§61, §62).
  const streak = currentStreakDays(entries);
  const showStreak = streak > 0;

  return (
    <div className="space-y-6">
      <header className="px-1">
        <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Your journey, at a glance.</p>
      </header>

      <section className="clay-card grid grid-cols-3 divide-x divide-border/40 rounded-3xl border border-border/60 bg-card">
        <Stat label="Today" value={formatNumber(todayTotal)} />
        <Stat label="Last 7 days" value={formatNumber(weekTotal)} />
        <Stat label="All time" value={formatCompact(allTime)} />
      </section>

      <section className="clay-card rounded-3xl border border-border/60 bg-card p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Last 7 days
          </h2>
          <p className="text-xs text-muted-foreground">
            {peak > 0 ? `Peak ${formatNumber(peak)}` : "No activity"}
          </p>
        </div>
        <div className="flex h-40 items-end gap-2">
          {points.map((p) => {
            const height = peak > 0 ? Math.max(4, (p.amount / peak) * 100) : 4;
            const isToday = p.key === today;
            return (
              <div key={p.key} className="flex flex-1 flex-col items-center gap-2">
                <div className="relative flex h-full w-full items-end">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className={`w-full rounded-lg ${
                      isToday
                        ? "bg-gradient-to-t from-crimson to-crimson-soft"
                        : "bg-muted"
                    }`}
                    style={{ minHeight: 4 }}
                  />
                  {p.amount > 0 && (
                    <span className="pointer-events-none absolute inset-x-0 -top-5 text-center text-[10px] tabular-nums text-muted-foreground">
                      {formatCompact(p.amount)}
                    </span>
                  )}
                </div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {formatShortDay(p.key)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="clay-metric rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">This week vs last</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {formatNumber(weekly.thisWeek)} <span className="text-sm text-muted-foreground">vs {formatNumber(weekly.lastWeek)}</span>
          </p>
          {weekly.diffPercent !== null && (
            <p className={`text-xs ${weekly.diffPercent >= 0 ? "text-emerald-500" : "text-crimson"}`}>
              {weekly.diffPercent >= 0 ? "+" : ""}
              {weekly.diffPercent.toFixed(0)}% {weekly.diffPercent >= 0 ? "more" : "less"} than last week
            </p>
          )}
        </div>
        {showStreak && (
          <div className="clay-metric rounded-2xl border border-border/60 bg-card p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Current streak</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {streak} {streak === 1 ? "day" : "days"}
            </p>
            <p className="text-xs text-muted-foreground">Consecutive days with any progress.</p>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Goal Progress
        </h2>
        {activeTrackers.length === 0 ? (
          <div className="clay-card rounded-3xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
            Your insights will appear as you begin logging progress.
          </div>
        ) : (
          <div className="space-y-3">
            {activeTrackers.map((t) => {
              const s = computeTrackerStats(t, entries);
              return (
                <div key={t.id} className="clay-metric rounded-2xl border border-border/60 bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {formatNumber(s.total)} / {formatNumber(t.targetCount)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">
                      {formatPercent(s.percent, s.percent < 10 ? 1 : 0)}
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-gold via-crimson to-crimson-deep"
                      style={{ width: `${Math.min(100, s.percent)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {(bestGoal || bestDay) && (
        <section className="grid gap-3 sm:grid-cols-2">
          {bestGoal && (
            <div className="clay-metric rounded-2xl border border-border/60 bg-card p-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Most active goal
              </p>
              <p className="mt-1 text-base font-medium">{bestGoal.tracker.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatNumber(bestGoal.total)} recorded
              </p>
            </div>
          )}
          {bestDay && (
            <div className="clay-metric rounded-2xl border border-border/60 bg-card p-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Personal best
              </p>
              <p className="mt-1 text-base font-medium">
                {formatRelativeDate(bestDay.key)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatNumber(bestDay.amount)} in a single day
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3.5">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
