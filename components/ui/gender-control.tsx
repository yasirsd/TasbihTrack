"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import type { Gender } from "@/lib/data/types";

/**
 * The single reusable Gender segmented control used by BOTH the Create
 * Account form and the Edit Profile sheet (Phase 7.2 P0.7). Its visual
 * language is the same as `Segmented` — an inset tray with a physically
 * raised active pill under Clay — but its ARIA is `radiogroup` because
 * the field maps one-to-one to a form value, not a tab surface.
 *
 * Nulls model the "not yet chosen" state during sign-up. Once selected,
 * Gender is one of the three canonical values.
 */
export interface GenderControlProps {
  value: Gender | "";
  onChange: (v: Gender) => void;
  disabled?: boolean;
  ariaLabel?: string;
  id?: string;
  className?: string;
}

const OPTIONS: readonly { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export function GenderControl({
  value,
  onChange,
  disabled = false,
  ariaLabel = "Gender",
  id,
  className,
}: GenderControlProps) {
  const groupRef = React.useRef<HTMLDivElement>(null);

  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const i = OPTIONS.findIndex((o) => o.value === value);
    // If nothing is selected yet, ArrowRight lands on the first option;
    // ArrowLeft lands on the last, matching WAI-ARIA radiogroup guidance.
    const start = i < 0 ? (e.key === "ArrowRight" ? -1 : 0) : i;
    const next =
      e.key === "ArrowLeft"
        ? (start - 1 + OPTIONS.length) % OPTIONS.length
        : (start + 1) % OPTIONS.length;
    onChange(OPTIONS[next].value);
    const btns = groupRef.current?.querySelectorAll<HTMLButtonElement>(
      "button[role='radio']",
    );
    btns?.[next]?.focus();
  };

  return (
    <div
      ref={groupRef}
      id={id}
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={handleKey}
      className={cn(
        // `.clay-segmented` picks up the inset-tray recipe from globals
        // under Clay; in Standard mode the muted background + shadow-inner
        // keeps a visible tray so both materials read alike.
        "clay-segmented relative grid w-full grid-flow-col auto-cols-fr items-stretch rounded-full bg-muted/60 p-1 shadow-inner",
        className,
      )}
    >
      {OPTIONS.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            data-active={active}
            disabled={disabled}
            tabIndex={active ? 0 : value === "" && o.value === OPTIONS[0].value ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative inline-flex h-11 min-w-0 select-none items-center justify-center gap-1 truncate rounded-full px-3 text-sm font-medium transition-[background,color,transform,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
              active
                ? "bg-background text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06),0_4px_10px_-4px_rgba(0,0,0,0.10)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
