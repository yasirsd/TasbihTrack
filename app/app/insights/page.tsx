"use client";
import * as React from "react";
import { useData } from "@/components/data/data-context";
import {
  bestActivityDay,
  computeTrackerStats,
  mostActiveTracker,
} from "@/lib/calculations/progress";
import { currentStreakDays, weeklyComparison } from "@/lib/calculations/pace";
import { formatCompact, formatNumber, formatPercent } from "@/lib/format";
import { formatRelativeDate, todayKey } from "@/lib/date-utils";
import {
  INSIGHTS_RANGE_LABELS,
  buildInsightsSeries,
  type InsightsRange,
} from "@/lib/calculations/insights-series";
import { InsightsChart } from "@/components/insights/insights-chart";
import { Segmented } from "@/components/ui/segmented";

/**
 * Phase 7 Insights.
 *
 * Persistent top KPIs: Today, This Week, Lifetime — always visible so
 * these three commonly-referenced numbers don't shift when the graph
 * range changes.
 *
 * Graph range is user-selectable: 7 Days / 30 Days / 1 Year / Lifetime.
 * All aggregation is done by `buildInsightsSeries` — see its test
 * file for the exact aggregation rules and boundary behavior.
 */
export default function InsightsPage() {
  const { entries, trackers } = useData();
  const [range, setRange] = React.useState<InsightsRange>("7d");

  const today = todayKey();

  // Persistent KPIs — independent of the graph range.
  const todayTotal = React.useMemo(
    () =>
      entries.filter((e) => e.entryDate === today).reduce((a, b) => a + b.amount, 0),
    [entries, today],
  );
  const weekSeries = React.useMemo(
    () => buildInsightsSeries(entries, "7d"),
    [entries],
  );
  const weekTotal = weekSeries.total;
  const allTime = React.useMemo(
    () => entries.reduce((a, b) => a + b.amount, 0),
    [entries],
  );

  const series = React.useMemo(
    () => buildInsightsSeries(entries, range),
    [entries, range],
  );

  // How many X-axis labels to render for each range. Sparse-labelling
  // rule so nothing overlaps on mobile.
  const labelStride = React.useMemo(() => {
    switch (series.range) {
      case "7d":
        return 1;
      case "30d":
        return 5;
      case "1y":
        return 2;
      case "lifetime":
        // At most ~8 labels regardless of series length.
        return Math.max(1, Math.ceil(series.points.length / 8));
    }
  }, [series.range, series.points.length]);

  const activeTrackers = trackers.filter((t) => t.status !== "archived");
  const bestGoal = mostActiveTracker(activeTrackers, entries);
  const bestDay = bestActivityDay(entries);
  const weekly = weeklyComparison(entries);
  const streak = currentStreakDays(entries);
  const showStreak = streak > 0;

  return (
    <div className="space-y-6">
      <header className="px-1">
        <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Your journey, at a glance.
        </p>
      </header>

      {/* Persistent KPIs */}
      <section className="clay-card clay-raised grid grid-cols-3 divide-x divide-border/40 rounded-3xl border border-border/60 bg-card">
        <Stat label="Today" value={formatNumber(todayTotal)} />
        <Stat label="This Week" value={formatNumber(weekTotal)} />
        <Stat label="Lifetime" value={formatCompact(allTime)} />
      </section>

      {/* Graph — range switcher + chart + range-scoped summary */}
      <section className="clay-card clay-raised space-y-4 rounded-3xl border border-border/60 bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Progress
            </h2>
            <p className="text-xs text-muted-foreground">
              {series.peak > 0
                ? `Peak ${formatCompact(series.peak)}`
                : "No activity"}
            </p>
          </div>
          <Segmented<InsightsRange>
            ariaLabel="Insights range"
            value={range}
            onChange={setRange}
            // Phase 7.2 P0.1 touch-target closure — bumped from sm (36 px)
            // to md (44 px) so the range picker meets the ≥44 px audit.
            // The shared `md` size uses tighter horizontal padding
            // (`px-2.5`) so the four labels "7 Days / 30 Days / 1 Year /
            // Lifetime" fit at a 320 px viewport with no line wrap.
            size="md"
            options={[
              { value: "7d", label: INSIGHTS_RANGE_LABELS["7d"] },
              { value: "30d", label: INSIGHTS_RANGE_LABELS["30d"] },
              { value: "1y", label: INSIGHTS_RANGE_LABELS["1y"] },
              { value: "lifetime", label: INSIGHTS_RANGE_LABELS.lifetime },
            ]}
          />
        </div>
        <InsightsChart
          series={series}
          labelStride={labelStride}
          ariaLabel={`Progress over ${INSIGHTS_RANGE_LABELS[range].toLowerCase()}`}
        />
        <div className="grid grid-cols-3 gap-2 pt-1 sm:gap-3">
          <RangeStat label="Total" value={formatCompact(series.total)} />
          <RangeStat
            label={series.bucket === "month" ? "Avg / Month" : "Avg / Day"}
            value={series.points.length > 0 ? formatCompact(series.average) : "—"}
          />
          <RangeStat label="Peak" value={formatCompact(series.peak)} />
        </div>
      </section>

      {/* Trends + streak */}
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="clay-metric clay-raised rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            This week vs last
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {formatNumber(weekly.thisWeek)}{" "}
            <span className="text-sm text-muted-foreground">
              vs {formatNumber(weekly.lastWeek)}
            </span>
          </p>
          {weekly.diffPercent !== null && (
            <p
              className={`text-xs ${weekly.diffPercent >= 0 ? "text-emerald-500" : "text-crimson"}`}
            >
              {weekly.diffPercent >= 0 ? "+" : ""}
              {weekly.diffPercent.toFixed(0)}%{" "}
              {weekly.diffPercent >= 0 ? "more" : "less"} than last week
            </p>
          )}
        </div>
        {showStreak && (
          <div className="clay-metric clay-raised rounded-2xl border border-border/60 bg-card p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Current streak
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {streak} {streak === 1 ? "day" : "days"}
            </p>
            <p className="text-xs text-muted-foreground">
              Consecutive days with any progress.
            </p>
          </div>
        )}
      </section>

      {/* Goal progress */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Goal Progress
        </h2>
        {activeTrackers.length === 0 ? (
          <div className="clay-card clay-raised rounded-3xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
            Your insights will appear as you begin logging progress.
          </div>
        ) : (
          <div className="space-y-3">
            {activeTrackers.map((t) => {
              const s = computeTrackerStats(t, entries);
              return (
                <div
                  key={t.id}
                  className="clay-metric clay-raised rounded-2xl border border-border/60 bg-card p-4"
                >
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
                  <div className="clay-progress-track mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="clay-progress-fill h-full rounded-full bg-gradient-to-r from-gold via-crimson to-crimson-deep"
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
            <div className="clay-metric clay-raised rounded-2xl border border-border/60 bg-card p-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Most active goal
              </p>
              <p className="mt-1 text-base font-medium">
                {bestGoal.tracker.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatNumber(bestGoal.total)} recorded
              </p>
            </div>
          )}
          {bestDay && (
            <div className="clay-metric clay-raised rounded-2xl border border-border/60 bg-card p-4">
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

function RangeStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="clay-inset-well rounded-2xl px-3 py-2.5 text-center">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}
