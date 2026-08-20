"use client";
import * as React from "react";
import {
  DayPicker,
  type ChevronProps,
  type DayButtonProps,
} from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProgressEntry, Tracker } from "@/lib/data/types";
import { useData } from "@/components/data/data-context";
import { formatNumber } from "@/lib/format";
import {
  buildActivityMap,
  dateKey as toKey,
  parseLocalDateKey,
  type ActivityMap,
} from "./utils";
import { CalendarDayDetails } from "./day-details";

/**
 * The single shared calendar primitive for both the Tracker Calendar tab and
 * the History Calendar tab. Business logic (which entries to consider) is
 * pushed to the caller through explicit props; visual/interactive concerns
 * — grid, keyboard nav, focus, month header, selected state, activity
 * indicator, day details panel — all live here.
 *
 * Built on `react-day-picker@9`. We compose around DayPicker's slots
 * (`DayButton`, `Chevron`, `Weekday`) rather than replacing the grid engine,
 * preserving keyboard navigation, ARIA semantics, and focus management.
 */
export interface TasbihCalendarProps {
  /** The tracker whose entries feed the calendar. Omit for History mode. */
  trackerId?: string;
  /** Explicit entries override (used by History when a filter is applied). */
  entries?: ProgressEntry[];
  /** Restrict displayed trackers when computing per-day groups (History). */
  trackers?: Tracker[];
  /** Force variant; defaults derived from trackerId presence. */
  variant?: "tracker" | "history";
  className?: string;
}

/** ActivityMap injected into custom DayButton via a small context. */
const ActivityContext = React.createContext<ActivityMap | null>(null);
const TodayKeyContext = React.createContext<string>(toKey(new Date()));

export function TasbihCalendar({
  trackerId,
  entries: entriesProp,
  trackers: trackersProp,
  variant,
  className,
}: TasbihCalendarProps) {
  const data = useData();
  const sourceEntries = entriesProp ?? data.entries;
  const relevant = React.useMemo(
    () =>
      trackerId ? sourceEntries.filter((e) => e.trackerId === trackerId) : sourceEntries,
    [sourceEntries, trackerId],
  );
  const effectiveVariant: "tracker" | "history" = variant ?? (trackerId ? "tracker" : "history");
  const trackers = trackersProp ?? data.trackers;

  const [month, setMonth] = React.useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selected, setSelected] = React.useState<Date | undefined>(undefined);

  // Build activity intensity relative to the currently visible month so a
  // single outlier day elsewhere doesn't wash out the visible one.
  const monthPrefix = React.useMemo(
    () => `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`,
    [month],
  );
  const monthEntries = React.useMemo(
    () => relevant.filter((e) => e.entryDate.startsWith(monthPrefix)),
    [relevant, monthPrefix],
  );
  const activityMap = React.useMemo(() => buildActivityMap(monthEntries), [monthEntries]);

  const todayKey = React.useMemo(() => toKey(new Date()), []);

  const selectedKey = selected ? toKey(selected) : null;

  return (
    <div className={cn("w-full", className)}>
      <ActivityContext.Provider value={activityMap}>
        <TodayKeyContext.Provider value={todayKey}>
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={setSelected}
            month={month}
            onMonthChange={setMonth}
            showOutsideDays
            weekStartsOn={0}
            className="tt-cal mx-auto w-full max-w-sm sm:max-w-md"
            classNames={classNamesMap}
            components={{
              DayButton: TasbihDayButton,
              Chevron: TasbihChevron,
            }}
            formatters={{
              // Use narrow (single-letter) weekday names everywhere; the
              // classNames map keeps them evenly aligned in the 7-column grid.
              formatWeekdayName: (weekday) =>
                weekday.toLocaleDateString(undefined, { weekday: "narrow" }),
            }}
            aria-label="Calendar"
          />
        </TodayKeyContext.Provider>
      </ActivityContext.Provider>

      {selectedKey && (
        <CalendarDayDetails
          dateKey={selectedKey}
          entries={relevant}
          trackers={trackers}
          variant={effectiveVariant}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// classNames: centralized Tailwind mapping for every DayPicker slot.
// One place to reason about visual system. Do not scatter overrides.
// ---------------------------------------------------------------------------

// DayPicker's default markup is a real <table>. Rather than fight the table
// semantics with `display: grid`, we use table-layout: fixed + width: 100%.
// That is the standard, keyboard-accessible way to guarantee 7 equal columns.
const classNamesMap = {
  root: "text-foreground",
  months: "flex flex-col gap-4",
  month: "space-y-3",
  month_caption:
    "relative flex h-11 items-center justify-center px-10 text-sm font-medium",
  caption_label: "text-sm font-medium tracking-tight",
  nav: "absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 items-center justify-between px-1",
  button_previous:
    "grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  button_next:
    "grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  month_grid: "w-full border-collapse [table-layout:fixed]",
  weekdays: "",
  weekday:
    "py-1 text-center text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground",
  week: "",
  day: "relative p-0.5 text-center align-middle",
  day_button: "", // fully styled inside TasbihDayButton
  outside: "text-muted-foreground/40",
  disabled: "opacity-40",
  today: "",
  selected: "",
};

// ---------------------------------------------------------------------------
// DayButton — the only place where each day is customized.
// Preserves DayPicker's forwarded button props (keyboard, focus, aria-*).
// ---------------------------------------------------------------------------

function TasbihDayButton({
  day,
  modifiers,
  className,
  ...buttonProps
}: DayButtonProps) {
  const activityMap = React.useContext(ActivityContext);
  const todayKey = React.useContext(TodayKeyContext);
  const key = toKey(day.date);
  const activity = activityMap?.get(key);
  const isToday = key === todayKey;
  const isSelected = Boolean(modifiers.selected);
  const isOutside = Boolean(modifiers.outside);
  const label = describeAria(day.date, activity, isToday);

  return (
    <button
      {...buttonProps}
      aria-label={label}
      data-selected={isSelected ? "true" : undefined}
      data-today={isToday ? "true" : undefined}
      className={cn(
        // Base cell — no heavy border on default state. Also carries
        // .clay-day so Clay mode repaints it as an inset/raised tile
        // (styles scoped to [data-ui-style="clay"] in globals.css).
        "clay-day group relative mx-auto flex h-10 w-10 flex-col items-center justify-center rounded-full text-[13px] font-medium leading-none transition-[background,color,box-shadow]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "hover:bg-muted/60",
        // Today: subtle gold ring, not selected styling
        isToday && !isSelected && "ring-1 ring-gold/60",
        // Selected: crimson filled surface with clear contrast
        isSelected &&
          "bg-gradient-to-br from-crimson to-crimson-deep text-white shadow-[0_6px_18px_-8px_hsl(var(--brand-1)/0.55)] hover:brightness-105",
        // Outside days: muted, non-emphasized but still interactive for month spillover
        isOutside && "text-muted-foreground/40 hover:bg-transparent",
        className,
      )}
    >
      <span className="tabular-nums">{day.date.getDate()}</span>
      <ActivityDot intensity={activity?.intensity ?? "none"} isSelected={isSelected} />
    </button>
  );
}

/**
 * A tiny bead-like indicator sitting just below the date. Always reserves
 * its vertical space so date numbers don't jitter between days with and
 * without activity.
 */
function ActivityDot({
  intensity,
  isSelected,
}: {
  intensity: "none" | "low" | "medium" | "high";
  isSelected: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "mt-0.5 h-1 w-1 rounded-full transition-opacity",
        intensity === "none" && "opacity-0",
        intensity === "low" && (isSelected ? "bg-white/70" : "bg-crimson/50"),
        intensity === "medium" && (isSelected ? "bg-white/85" : "bg-crimson/75"),
        intensity === "high" && (isSelected ? "bg-gold" : "bg-gradient-to-r from-crimson to-gold"),
        intensity === "high" && "h-1 w-2",
      )}
    />
  );
}

function describeAria(
  date: Date,
  activity: { total: number; entryCount: number } | undefined,
  isToday: boolean,
): string {
  const dateLabel = date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const parts: string[] = [dateLabel];
  if (isToday) parts.push("today");
  if (activity && activity.total > 0) {
    parts.push(`${formatNumber(activity.total)} recitations recorded`);
    parts.push(activity.entryCount === 1 ? "1 entry" : `${activity.entryCount} entries`);
  } else {
    parts.push("no progress recorded");
  }
  return parts.join(", ");
}

// ---------------------------------------------------------------------------
// Chevron — Lucide icons in place of DayPicker's default SVGs.
// ---------------------------------------------------------------------------

function TasbihChevron({ orientation, className }: ChevronProps) {
  const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
  return <Icon className={cn("h-4 w-4", className)} aria-hidden />;
}

// Re-export utils for consumers that want to reuse the aggregation.
export { buildActivityMap, parseLocalDateKey } from "./utils";
