import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 1011 Tracker brand system.
 *
 * The hero of the identity is the numeral 1011. The middle "0" is drawn as a
 * ring — a subtle Tasbih-bead reference without any pasted-on religious clip
 * art. The three "1"s form a rhythm that evokes beads on a string. Both are
 * pure geometry rather than typography, so the mark reads cleanly at 16px
 * (favicon) all the way up to 512px (PWA maskable).
 *
 * Provides:
 *   • <BrandMark />    — the standalone 1011 symbol (square, brand-neutral).
 *   • <BrandWordmark /> — symbol + "1011 Tracker" wordmark, used in headers.
 *
 * The primitive shape is:
 *   1 1 [ring] 1 1  — reduced to 1 0 1 1 by the shared visual weight.
 */

export interface BrandMarkProps {
  size?: number;
  className?: string;
  /** Force a specific color scheme; default follows current color. */
  tone?: "default" | "onDark" | "onLight" | "gradient";
  /** Include a subtle rounded background — useful for icons. */
  chip?: boolean;
  title?: string;
}

const VB = 64;
const STROKE = 7;
const BASELINE_Y = 46;
const TOP_Y = 18;
const CENTER_Y = (BASELINE_Y + TOP_Y) / 2; // 32
const HEIGHT = BASELINE_Y - TOP_Y; // 28
const BAR_WIDTH = STROKE;
const RING_R = HEIGHT / 2; // 14
const RING_STROKE = STROKE;

// x positions for [1] [0] [1] [1]
const GAP = 3;
const totalWidth = BAR_WIDTH + GAP + RING_R * 2 + GAP + BAR_WIDTH + GAP + BAR_WIDTH;
const startX = (VB - totalWidth) / 2;
const X1 = startX + BAR_WIDTH / 2;
const X0 = startX + BAR_WIDTH + GAP + RING_R;
const X2 = X0 + RING_R + GAP + BAR_WIDTH / 2;
const X3 = X2 + BAR_WIDTH + GAP;

export function BrandMark({
  size = 48,
  className,
  tone = "default",
  chip = false,
  title = "1011",
}: BrandMarkProps) {
  const gradId = React.useId();
  const color = tone === "gradient" ? `url(#${gradId})` : "currentColor";
  const chipFill =
    tone === "onDark" ? "#09090B" : tone === "onLight" ? "#FDFCF7" : "transparent";

  return (
    <svg
      viewBox={`0 0 ${VB} ${VB}`}
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={cn("shrink-0", className)}
    >
      {tone === "gradient" && (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FDC500" />
            <stop offset="60%" stopColor="#EF233C" />
            <stop offset="100%" stopColor="#B21728" />
          </linearGradient>
        </defs>
      )}
      {chip && <rect x="1" y="1" width={VB - 2} height={VB - 2} rx="14" fill={chipFill} />}
      {/* 1 */}
      <Bar x={X1} color={color} />
      {/* 0 */}
      <circle
        cx={X0}
        cy={CENTER_Y}
        r={RING_R - RING_STROKE / 2}
        fill="none"
        stroke={color}
        strokeWidth={RING_STROKE}
      />
      {/* 1 */}
      <Bar x={X2} color={color} />
      {/* 1 */}
      <Bar x={X3} color={color} />
    </svg>
  );
}

function Bar({ x, color }: { x: number; color: string }) {
  const left = x - BAR_WIDTH / 2;
  const cap = BAR_WIDTH / 2;
  return (
    <rect
      x={left}
      y={TOP_Y}
      width={BAR_WIDTH}
      height={HEIGHT}
      rx={cap}
      ry={cap}
      fill={color}
    />
  );
}

/**
 * Horizontal composition — mark + wordmark. Used in the auth header and
 * the sidebar. The mark is aria-hidden so screen readers only announce the
 * text, not "1011 1011 Tracker" twice.
 */
export function BrandWordmark({
  className,
  markSize = 28,
}: {
  className?: string;
  markSize?: number;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <BrandMark size={markSize} tone="gradient" aria-hidden title="" />
      <span className="text-lg font-semibold tracking-tight">1011 Tracker</span>
    </div>
  );
}

// Preserve the previous export names for compatibility with any callers.
export const LogoMark = BrandMark;
export const Wordmark = BrandWordmark;
