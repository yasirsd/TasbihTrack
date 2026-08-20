import * as React from "react";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { InsightsChart, clampTooltipLeft } from "./insights-chart";
import type { InsightsSeries } from "@/lib/calculations/insights-series";

/**
 * Phase 7.2 P0.3 chart invariants — the visual promises the redesign
 * makes that are cheap to encode as tests. Rendering assertions rely on
 * the SVG structure the component always emits.
 */

function makeSeries(overrides: Partial<InsightsSeries> = {}): InsightsSeries {
  const points = [
    { key: "2026-08-13", amount: 0, label: "Wed", tooltipLabel: "Aug 13" },
    { key: "2026-08-14", amount: 100, label: "Thu", tooltipLabel: "Aug 14" },
    { key: "2026-08-15", amount: 250, label: "Fri", tooltipLabel: "Aug 15" },
    { key: "2026-08-16", amount: 0, label: "Sat", tooltipLabel: "Aug 16" },
    { key: "2026-08-17", amount: 400, label: "Sun", tooltipLabel: "Aug 17" },
    { key: "2026-08-18", amount: 0, label: "Mon", tooltipLabel: "Aug 18" },
    { key: "2026-08-19", amount: 150, label: "Tue", tooltipLabel: "Aug 19" },
  ];
  return {
    range: "7d",
    bucket: "day",
    points,
    total: 900,
    peak: 400,
    activeBuckets: 4,
    average: Math.round(900 / 7),
    ...overrides,
  };
}

describe("InsightsChart — structural invariants", () => {
  it("renders exactly one bucket stem per point", () => {
    const s = makeSeries();
    const { container } = render(
      <InsightsChart series={s} ariaLabel="test-chart" />,
    );
    const stems = container.querySelectorAll('[data-testid="chart-stem"]');
    expect(stems.length).toBe(s.points.length);
  });

  it("renders the same number of stems for a 30-day range", () => {
    const points = Array.from({ length: 30 }, (_, i) => ({
      key: `k-${i}`,
      amount: i % 3 === 0 ? 100 : 0,
      label: `${i}`,
      tooltipLabel: `Day ${i}`,
    }));
    const s: InsightsSeries = {
      range: "30d",
      bucket: "day",
      points,
      total: 1000,
      peak: 100,
      activeBuckets: 10,
      average: 33,
    };
    const { container } = render(<InsightsChart series={s} ariaLabel="30d" />);
    expect(container.querySelectorAll('[data-testid="chart-stem"]').length).toBe(30);
  });

  it("renders 12 stems for a 1-year monthly range", () => {
    const points = Array.from({ length: 12 }, (_, i) => ({
      key: `2026-${String(i + 1).padStart(2, "0")}`,
      amount: 0,
      label: "M",
      tooltipLabel: "Month",
    }));
    const s: InsightsSeries = {
      range: "1y",
      bucket: "month",
      points,
      total: 0,
      peak: 0,
      activeBuckets: 0,
      average: 0,
    };
    const { container } = render(<InsightsChart series={s} ariaLabel="1y" />);
    expect(container.querySelectorAll('[data-testid="chart-stem"]').length).toBe(12);
  });

  it("renders the empty-state overlay for an empty series", () => {
    const s: InsightsSeries = {
      range: "lifetime",
      bucket: "day",
      points: [],
      total: 0,
      peak: 0,
      activeBuckets: 0,
      average: 0,
    };
    const { container } = render(<InsightsChart series={s} ariaLabel="empty" />);
    expect(container.textContent).toContain("No progress logged yet.");
  });
});

describe("InsightsChart — tooltip clamping (P0.3)", () => {
  it("keeps the tooltip inside the plot rect at the leftmost point", () => {
    // A point at x=8 with a 62-px half-width tooltip must clamp to 62.
    expect(clampTooltipLeft(8, 360)).toBe(62);
  });

  it("keeps the tooltip inside the plot rect at the rightmost point", () => {
    expect(clampTooltipLeft(355, 360)).toBe(360 - 62);
  });

  it("passes through when the selection is comfortably inside", () => {
    expect(clampTooltipLeft(180, 360)).toBe(180);
  });

  it("survives a zero container width without dividing weirdly", () => {
    expect(clampTooltipLeft(100, 0)).toBe(0);
  });
});
