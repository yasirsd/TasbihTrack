"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { formatCompact, formatNumber } from "@/lib/format";
import type { InsightsSeries } from "@/lib/calculations/insights-series";

/**
 * Phase 7.2 P0.3 Insights chart.
 *
 * Design goals:
 *   • Every bucket has a visible vertical STEM — the chart's structural
 *     spine. 7-day shows 7 stems, 30-day shows 30, 1-year shows 12,
 *     lifetime shows however many buckets it generated. Stems make the
 *     bucket lanes readable at a glance without heavy zebra striping.
 *   • Dot at every bucket (filled for a value, hollow for zero) so zeros
 *     are honest.
 *   • Selected column highlights with a translucent brand gradient and
 *     the tooltip anchors near the selected point column. Tooltip is
 *     ALWAYS clamped inside the plot rect — see `tooltipLeftPct`.
 *   • The full lane is a tap target (invisible rect) — users never have
 *     to hit the tiny dot precisely.
 *   • ResizeObserver measures the container so the SVG viewBox tracks
 *     its actual pixel width. Circles stay circular, text stays crisp,
 *     strokes never distort at any device width. Fixed HEIGHT (176 mobile,
 *     224 desktop) keeps the aspect predictable.
 *   • Keyboard navigable (arrow keys + Home/End + Escape).
 */

export interface InsightsChartProps {
  series: InsightsSeries;
  /**
   * Show every Nth X-axis label. First + last + every Nth are guaranteed
   * so the axis is never a blank line.
   */
  labelStride?: number;
  ariaLabel: string;
  className?: string;
}

// Padding is in SVG pixels. Because the viewBox tracks pixel dimensions,
// these values also render as literal pixels — 44 px on the left leaves
// room for the compact Y-axis labels (e.g. "1.2K"), 40 px at the bottom
// for the X-axis labels, and 42 px at the top for the anchored tooltip.
const PAD = { top: 42, right: 20, bottom: 40, left: 44 };
// Fallback width used before ResizeObserver's first measurement (or in
// SSR). Chosen to be a plausible mobile viewport so the SSR paint is
// close to what hydration produces.
const FALLBACK_W = 360;
// Chart heights — literal pixels. Mobile-first, taller on ≥sm.
const H_MOBILE = 176;
const H_DESKTOP = 224;

export function InsightsChart({
  series,
  labelStride = 1,
  ariaLabel,
  className,
}: InsightsChartProps) {
  const { points } = series;
  const [selected, setSelected] = React.useState<number | null>(null);

  // Auto-clear selection when the underlying series changes so switching
  // ranges doesn't leave a stale highlight on a phantom column.
  React.useEffect(() => setSelected(null), [series]);

  // ---------------------------------------------------------------------
  // Responsive measurement via ResizeObserver — the container's actual
  // pixel width drives the SVG viewBox, so we can drop
  // preserveAspectRatio="none" and let text/circles render undistorted.
  // ---------------------------------------------------------------------
  const wellRef = React.useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = React.useState<number>(FALLBACK_W);
  const [height, setHeight] = React.useState<number>(H_MOBILE);

  React.useEffect(() => {
    const el = wellRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cw = Math.floor(entry.contentRect.width);
        if (cw > 0) setWidth(cw);
      }
    });
    ro.observe(el);
    // Track viewport for the mobile/desktop height break.
    const mql =
      typeof window !== "undefined" && "matchMedia" in window
        ? window.matchMedia("(min-width: 640px)")
        : null;
    const applyH = () => setHeight(mql?.matches ? H_DESKTOP : H_MOBILE);
    applyH();
    mql?.addEventListener?.("change", applyH);
    return () => {
      ro.disconnect();
      mql?.removeEventListener?.("change", applyH);
    };
  }, []);

  // Empty series → still render the well frame + friendly message.
  if (points.length === 0) {
    return (
      <ChartFrame wellRef={wellRef} ariaLabel={ariaLabel} className={className} height={height}>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-full border border-border/50 bg-card/90 px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
            No progress logged yet.
          </div>
        </div>
      </ChartFrame>
    );
  }

  const peak = series.peak;
  const yMax = peak > 0 ? peak : 1;

  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = Math.max(0, height - PAD.top - PAD.bottom);
  const laneW = innerW / points.length;
  const xFor = (i: number) => PAD.left + laneW / 2 + i * laneW;
  const yFor = (v: number) => PAD.top + innerH - (v / yMax) * innerH;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(2)} ${yFor(p.amount).toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L ${xFor(points.length - 1).toFixed(2)} ${yFor(0).toFixed(2)} L ${xFor(0).toFixed(2)} ${yFor(0).toFixed(2)} Z`;

  // Sparse X labels — first + last + every Nth.
  const stride = Math.max(1, labelStride);
  const labelIdxSet = new Set<number>([0, points.length - 1]);
  for (let i = 0; i < points.length; i += stride) labelIdxSet.add(i);
  const visibleXLabels = [...labelIdxSet].sort((a, b) => a - b);

  const guideRatios = peak > 0 ? [0.25, 0.5, 0.75, 1] : [0.5];
  const guides = guideRatios.map((r) => ({ y: yFor(yMax * r), v: Math.round(yMax * r) }));

  const sel = selected != null ? points[selected] : null;
  const selX = selected != null ? xFor(selected) : null;
  const selY = selected != null ? yFor(points[selected].amount) : null;

  // Tooltip horizontal clamping — after positioning the tooltip at the
  // selected point's X, clamp so its centered pill never overflows the
  // plot horizontally. Tooltip is ~120 px wide max — half of that is the
  // clamp margin from each edge.
  const TOOLTIP_HALF = 62;
  const tooltipLeftPx =
    selX == null ? 0 : Math.max(TOOLTIP_HALF, Math.min(width - TOOLTIP_HALF, selX));
  const tooltipLeftPct = width > 0 ? (tooltipLeftPx / width) * 100 : 50;
  const tooltipTopPct = height > 0 && selY != null ? ((selY - 14) / height) * 100 : 0;

  return (
    <ChartFrame wellRef={wellRef} ariaLabel={ariaLabel} className={className} height={height}>
      <svg
        // No preserveAspectRatio="none" — viewBox tracks the container's
        // actual pixel width so text and circles never stretch.
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        aria-label={ariaLabel}
        className="block h-full w-full"
        onKeyDown={(e) => {
          if (points.length === 0) return;
          if (e.key === "ArrowRight" || e.key === "ArrowDown") {
            e.preventDefault();
            setSelected((s) => (s == null ? 0 : Math.min(points.length - 1, s + 1)));
          } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            e.preventDefault();
            setSelected((s) => (s == null ? points.length - 1 : Math.max(0, s - 1)));
          } else if (e.key === "Home") {
            e.preventDefault();
            setSelected(0);
          } else if (e.key === "End") {
            e.preventDefault();
            setSelected(points.length - 1);
          } else if (e.key === "Escape") {
            setSelected(null);
          }
        }}
        tabIndex={0}
      >
        <defs>
          <linearGradient id="chart-area-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--brand-1))" stopOpacity="0.35" />
            <stop offset="70%" stopColor="hsl(var(--brand-1))" stopOpacity="0.06" />
            <stop offset="100%" stopColor="hsl(var(--brand-1))" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="chart-lane-selected" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--brand-1))" stopOpacity="0.14" />
            <stop offset="100%" stopColor="hsl(var(--brand-1))" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Selected lane background — pops the column being inspected. */}
        {selected != null && (
          <rect
            x={PAD.left + selected * laneW}
            y={PAD.top}
            width={laneW}
            height={innerH}
            fill="url(#chart-lane-selected)"
            rx="8"
          />
        )}

        {/* Horizontal guide lines with Y-axis value labels. */}
        {guides.map((g, i) => (
          <g key={`guide-${i}`}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={g.y}
              y2={g.y}
              stroke="hsl(var(--muted-foreground))"
              strokeOpacity="0.14"
              strokeWidth="1"
              strokeDasharray={i === guides.length - 1 ? "0" : "4 6"}
            />
            <text
              x={PAD.left - 8}
              y={g.y + 4}
              textAnchor="end"
              fontSize="11"
              fill="hsl(var(--muted-foreground))"
            >
              {formatCompact(g.v)}
            </text>
          </g>
        ))}

        {/* Baseline — anchors the visual. */}
        <line
          x1={PAD.left}
          x2={width - PAD.right}
          y1={yFor(0)}
          y2={yFor(0)}
          stroke="hsl(var(--muted-foreground))"
          strokeOpacity="0.28"
          strokeWidth="1.2"
        />

        {/* Per-bucket VERTICAL STEMS — the chart's structural spine.
         * Stronger stem every 5 buckets in a 30-day range gives users
         * something to count against (each 5-day block reads as a
         * micro-milestone). Every stem drops from the top of the plot
         * rect to the baseline. */}
        {points.map((_, i) => {
          const x = xFor(i);
          const isFive = series.bucket === "day" && points.length >= 20 && (i + 1) % 5 === 0;
          const isSelected = selected === i;
          return (
            <line
              key={`stem-${i}`}
              data-testid="chart-stem"
              x1={x}
              x2={x}
              y1={PAD.top}
              y2={yFor(0)}
              stroke="hsl(var(--muted-foreground))"
              strokeOpacity={isSelected ? 0.35 : isFive ? 0.16 : 0.08}
              strokeWidth={isSelected ? 1.4 : 1}
              strokeDasharray={isSelected ? "0" : "1 3"}
            />
          );
        })}

        {/* Area fill — only when peak > 0. */}
        {peak > 0 && <path d={areaPath} fill="url(#chart-area-gradient)" />}

        {/* Line stroke. */}
        {peak > 0 && (
          <path
            d={linePath}
            fill="none"
            stroke="hsl(var(--brand-1))"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Data dots — every bucket. Filled for value, hollow for zero. */}
        {points.map((p, i) => {
          const cx = xFor(i);
          const cy = yFor(p.amount);
          const isSelected = selected === i;
          const hasValue = p.amount > 0;
          return (
            <g key={p.key}>
              {hasValue ? (
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 5.5 : 3.4}
                  fill="hsl(var(--brand-1))"
                  stroke="hsl(var(--clay-inset))"
                  strokeWidth={isSelected ? 3 : 2}
                />
              ) : (
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 4 : 2.5}
                  fill="hsl(var(--clay-inset))"
                  stroke="hsl(var(--muted-foreground))"
                  strokeOpacity={isSelected ? 0.8 : 0.4}
                  strokeWidth={isSelected ? 2 : 1.2}
                />
              )}
              {/* Full-lane tap target. */}
              <rect
                x={PAD.left + i * laneW}
                y={PAD.top}
                width={laneW}
                height={innerH}
                fill="transparent"
                onClick={() => setSelected(isSelected ? null : i)}
                style={{ cursor: "pointer" }}
              />
            </g>
          );
        })}

        {/* X-axis labels — sparse; selected gets brand color for emphasis. */}
        {visibleXLabels.map((i) => (
          <text
            key={`xlabel-${i}`}
            x={xFor(i)}
            y={height - 14}
            textAnchor="middle"
            fontSize="11"
            fill={
              selected === i
                ? "hsl(var(--brand-1))"
                : "hsl(var(--muted-foreground))"
            }
            fontWeight={selected === i ? 600 : 400}
          >
            {points[i].label}
          </text>
        ))}
      </svg>

      {/* Anchored tooltip — clamped inside the plot rect. */}
      {sel && selected != null && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full"
          style={{
            left: `${tooltipLeftPct}%`,
            top: `${tooltipTopPct}%`,
          }}
        >
          <div className="clay-raised flex max-w-[120px] flex-col items-center whitespace-nowrap rounded-xl border border-border/40 bg-card px-3 py-1.5 text-center shadow-md">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {sel.tooltipLabel}
            </span>
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {formatNumber(sel.amount)}
            </span>
          </div>
        </div>
      )}

      {peak === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-full border border-border/40 bg-card/90 px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
            No progress logged in this period yet.
          </div>
        </div>
      )}
    </ChartFrame>
  );
}

// ---------------------------------------------------------------------------
// Frame — the sculpted well the chart lives inside.
// Height is passed in so the wrapper matches the SVG's chosen pixel height.
// ---------------------------------------------------------------------------

function ChartFrame({
  wellRef,
  ariaLabel: _ariaLabel,
  className,
  children,
  height,
}: {
  wellRef: React.RefObject<HTMLDivElement | null>;
  ariaLabel: string;
  className?: string;
  children: React.ReactNode;
  height: number;
}) {
  return (
    <div
      ref={wellRef}
      className={cn(
        "clay-chart-well relative overflow-hidden rounded-2xl p-3 pt-4",
        className,
      )}
      style={{ height: height + 24 /* padding compensation */ }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Test-only helper — exported so unit tests can verify the clamp keeps
// the tooltip inside the plot rect at any selected column position.
// Kept in this module so the constant (TOOLTIP_HALF) stays a single
// source of truth.
// ---------------------------------------------------------------------------
export function clampTooltipLeft(
  selectedX: number,
  width: number,
  tooltipHalfWidth = 62,
): number {
  if (width <= 0) return 0;
  return Math.max(tooltipHalfWidth, Math.min(width - tooltipHalfWidth, selectedX));
}
