"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { formatCompact, formatNumber } from "@/lib/format";
import type { InsightsSeries } from "@/lib/calculations/insights-series";

/**
 * Phase 7 Insights chart.
 *
 * A compact line + soft-area chart, rendered inline SVG so there is no
 * chart-library dependency. Sits inside a `.clay-chart-well` container
 * that gives the plotting area a physically recessed feel under Clay
 * (see globals.css). Standard mode still renders correctly — the well
 * class is scoped to `[data-ui-style="clay"]`.
 *
 * Why not a bar chart?
 *   The previous 7-day view drew each bar with `bg-muted`, which reads
 *   as invisible against the dark card background in Clay mode. Only
 *   "today" got a crimson gradient. The perceived bug ("graph not
 *   working") was actually correct data + invisible geometry. A line +
 *   area chart always draws a visible path regardless of bucket values,
 *   including a horizontal line at zero when the whole range is empty.
 *
 * Correctness contract with `buildInsightsSeries`:
 *   • `series.points` order maps directly to left→right on the X axis.
 *   • Zero points render at the true baseline (never collapse to
 *     "no data" invisibly).
 *   • Empty series renders the empty-state placeholder inside the well.
 *
 * Y-axis behaviour:
 *   • If all points are 0, plot a flat line halfway up the well so it's
 *     visibly present and the empty state can explain.
 *   • Otherwise the top of the well = `peak`, the bottom = 0. Two soft
 *     horizontal guide lines at 33% and 66% of peak.
 *
 * X-axis labels are SPARSE — the caller decides how many to show via
 * `labelStride`. For 30-day daily buckets we typically show every 5th.
 * For monthly buckets we usually show every label.
 *
 * Tap-to-select tooltip: a small raised clay pill anchored to the
 * selected point. Points are always tappable — the touch target is
 * larger than the visible dot for accessibility.
 */

export interface InsightsChartProps {
  series: InsightsSeries;
  /** How many X-axis labels to show. 0 = every point; N = every Nth. */
  labelStride?: number;
  /** Title to describe the chart for screen readers. */
  ariaLabel: string;
  className?: string;
}

// SVG viewBox — we render in a fixed 800×280 coordinate space then
// scale via CSS. Height is chosen so the chart stays readable at mobile
// widths (390 → ~136 px rendered height inside the padded well).
const VIEW_W = 800;
const VIEW_H = 280;
const PAD = { top: 24, right: 16, bottom: 32, left: 40 };

export function InsightsChart({
  series,
  labelStride = 1,
  ariaLabel,
  className,
}: InsightsChartProps) {
  const { points, peak } = series;
  const [selected, setSelected] = React.useState<number | null>(null);

  // Empty state — the plot well itself renders, so the frame stays
  // consistent even without data.
  if (points.length === 0) {
    return (
      <EmptyChart className={className}>No progress logged yet.</EmptyChart>
    );
  }
  if (peak === 0) {
    return (
      <EmptyChart className={className}>
        No progress logged in this period yet.
      </EmptyChart>
    );
  }

  const innerW = VIEW_W - PAD.left - PAD.right;
  const innerH = VIEW_H - PAD.top - PAD.bottom;
  const stepX = points.length > 1 ? innerW / (points.length - 1) : innerW / 2;

  const xFor = (i: number) =>
    points.length > 1 ? PAD.left + i * stepX : PAD.left + innerW / 2;
  const yFor = (v: number) => PAD.top + innerH - (v / peak) * innerH;

  // Line path — straight segments between points, no curves. Cheap and
  // predictable; a smoothed curve can misrepresent zero buckets.
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(2)} ${yFor(p.amount).toFixed(2)}`)
    .join(" ");

  // Area path — line path plus baseline back to start.
  const areaPath = `${linePath} L ${xFor(points.length - 1).toFixed(2)} ${yFor(0)} L ${xFor(0).toFixed(2)} ${yFor(0)} Z`;

  const guideYs = [peak, peak * 0.66, peak * 0.33];

  // Sparse X labels — always show first + last, plus every `labelStride`-th.
  const visibleXLabels = points
    .map((_, i) => i)
    .filter((i) => i === 0 || i === points.length - 1 || i % Math.max(1, labelStride) === 0);

  const sel = selected != null ? points[selected] : null;

  return (
    <div className={cn("clay-chart-well relative overflow-hidden rounded-2xl p-3 pt-4", className)}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={ariaLabel}
        className="block h-40 w-full sm:h-48"
      >
        <defs>
          <linearGradient id="chart-area-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--brand-1))" stopOpacity="0.35" />
            <stop offset="100%" stopColor="hsl(var(--brand-1))" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Soft horizontal guides — three subtle lines with peak values. */}
        {guideYs.map((v, i) => {
          const y = yFor(v);
          return (
            <g key={i}>
              <line
                x1={PAD.left}
                x2={VIEW_W - PAD.right}
                y1={y}
                y2={y}
                stroke="hsl(var(--muted-foreground))"
                strokeOpacity="0.14"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 6}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="hsl(var(--muted-foreground))"
                className="tabular-nums"
              >
                {v > 0 ? formatCompact(Math.round(v)) : "0"}
              </text>
            </g>
          );
        })}

        {/* Area fill (only when peak > 0). */}
        <path d={areaPath} fill="url(#chart-area-gradient)" />

        {/* Line stroke. */}
        <path
          d={linePath}
          fill="none"
          stroke="hsl(var(--brand-1))"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Points — small dots at non-zero + a big invisible hit-target
         * behind each. Selected point pops. */}
        {points.map((p, i) => {
          const cx = xFor(i);
          const cy = yFor(p.amount);
          const isSelected = selected === i;
          return (
            <g key={p.key}>
              {p.amount > 0 && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 5.5 : 3.2}
                  fill="hsl(var(--brand-1))"
                  stroke="hsl(var(--clay-inset))"
                  strokeWidth={isSelected ? 3 : 2}
                />
              )}
              {/* Larger invisible touch target for tap-selection. */}
              <rect
                x={cx - stepX / 2}
                y={PAD.top}
                width={stepX}
                height={innerH}
                fill="transparent"
                onClick={() => setSelected(isSelected ? null : i)}
                style={{ cursor: "pointer" }}
              />
            </g>
          );
        })}

        {/* X-axis labels — sparse. */}
        {visibleXLabels.map((i) => (
          <text
            key={i}
            x={xFor(i)}
            y={VIEW_H - 10}
            textAnchor="middle"
            fontSize="11"
            fill="hsl(var(--muted-foreground))"
          >
            {points[i].label}
          </text>
        ))}
      </svg>

      {/* Selected-point tooltip. */}
      {sel && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-border/40 bg-card px-3 py-1 text-xs shadow-md"
        >
          <span className="text-muted-foreground">{sel.tooltipLabel}</span>{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {formatNumber(sel.amount)}
          </span>
        </div>
      )}
    </div>
  );
}

function EmptyChart({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "clay-chart-well grid h-40 place-items-center rounded-2xl p-3 text-center text-sm text-muted-foreground sm:h-48",
        className,
      )}
    >
      {children}
    </div>
  );
}
