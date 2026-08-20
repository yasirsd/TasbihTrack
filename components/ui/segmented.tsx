"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A segmented control.
 *
 * Directly addresses PROMPT 5A §2 (Sign In / Create Account clarity):
 * the active mode must be unmistakable. Selected option gets a strong
 * background, weight, and (in Clay) physically lifts out of the tray.
 *
 * Keyboard: left/right arrows move focus + selection. Tab moves in/out.
 * The whole thing is one focus stop when nothing is selected; once
 * inside, arrow keys switch options.
 */
export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

export interface SegmentedProps<T extends string>
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  value: T;
  onChange: (v: T) => void;
  options: readonly SegmentedOption<T>[];
  size?: "sm" | "md" | "lg";
  ariaLabel: string;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  ariaLabel,
  className,
  ...divProps
}: SegmentedProps<T>) {
  // Sizes are picked so Phase 7.2 P0.6 touch targets are met.
  //   sm  → 36px (dense chips)
  //   md  → 44px (Insights range picker — Phase 7.2 P0.1 minimum)
  //   lg  → 52px (auth mode + History view — the primary segmented row)
  //
  // Horizontal padding is scaled with the size AND kept mildly tight so
  // four labels ("7 Days / 30 Days / 1 Year / Lifetime") still fit in
  // the ≥44 px `md` tray at a 320 px viewport. `whitespace-nowrap` is
  // enforced on the buttons themselves to prevent multi-line wrap when
  // a cell is narrower than its label — the label may nudge its cell
  // wider (still within 320 px in practice), never break lines.
  const sizeStyles: Record<"sm" | "md" | "lg", string> = {
    sm: "h-9 text-xs px-2",
    md: "h-11 text-sm px-2.5",
    lg: "h-[52px] text-base px-4",
  };

  const groupRef = React.useRef<HTMLDivElement>(null);
  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const i = options.findIndex((o) => o.value === value);
    if (i < 0) return;
    const next =
      e.key === "ArrowLeft"
        ? (i - 1 + options.length) % options.length
        : (i + 1) % options.length;
    onChange(options[next].value);
    const btns = groupRef.current?.querySelectorAll<HTMLButtonElement>(
      "button[role='tab']",
    );
    btns?.[next]?.focus();
  };

  return (
    <div
      ref={groupRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKey}
      className={cn(
        "clay-segmented relative grid w-full grid-flow-col auto-cols-fr items-stretch rounded-full bg-muted/60 p-1 shadow-inner",
        className,
      )}
      {...divProps}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            data-active={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative inline-flex min-w-0 select-none items-center justify-center whitespace-nowrap rounded-full font-medium transition-[background,color,transform,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation active:scale-[0.98]",
              sizeStyles[size],
              active
                ? "bg-background text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06),0_4px_10px_-4px_rgba(0,0,0,0.10)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
