"use client";
import * as React from "react";
import { DayPicker, type ChevronProps } from "react-day-picker";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatLongDate, todayKey, toLocalDateKey } from "@/lib/date-utils";
import { parseLocalDateKey } from "@/components/calendar/utils";

/**
 * The single date-picker used across TasbihTrack — Create/Edit Tracker
 * (Target Date), Add/Edit Progress (Entry Date), and any other date field.
 *
 * Built on Popover + react-day-picker, matching the visual language of the
 * shared TasbihCalendar (no activity dots — this variant is for selection
 * only, not for browsing history).
 *
 * Value is a date-key string (YYYY-MM-DD) — TasbihTrack's local-day
 * convention. Never a Date object across boundaries, so there is no UTC
 * shift.
 */
export interface TasbihDatePickerProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  /** Restrict selectable range. Defaults are open on both sides. */
  minKey?: string;
  maxKey?: string;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
}

export function TasbihDatePicker({
  value,
  onChange,
  minKey,
  maxKey,
  placeholder = "Select a date",
  disabled,
  allowClear = true,
  className,
  id,
  "aria-label": ariaLabel,
}: TasbihDatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = value ? parseLocalDateKey(value) : undefined;
  const minDate = minKey ? parseLocalDateKey(minKey) : undefined;
  const maxDate = maxKey ? parseLocalDateKey(maxKey) : undefined;
  const label = value ? friendlyLabel(value) : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-label={ariaLabel ?? label}
          className={cn(
            "flex h-12 w-full items-center justify-between gap-2 rounded-2xl border border-border/70 bg-background/60 px-4 text-left text-base shadow-sm transition-colors",
            "focus-visible:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted/30",
            !value && "text-muted-foreground/70",
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{label}</span>
          </span>
          {value && allowClear && !disabled ? (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange(undefined);
              }}
              className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-muted"
              aria-label="Clear date"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[92vw] p-2">
        <DayPicker
          mode="single"
          selected={selected}
          defaultMonth={selected ?? (minDate ?? new Date())}
          onSelect={(d) => {
            if (!d) return;
            onChange(toLocalDateKey(d));
            setOpen(false);
          }}
          disabled={buildDisabled(minDate, maxDate)}
          weekStartsOn={0}
          showOutsideDays
          classNames={PICKER_CLASSES}
          components={{ Chevron: PickerChevron }}
          formatters={{
            formatWeekdayName: (weekday) =>
              weekday.toLocaleDateString(undefined, { weekday: "narrow" }),
          }}
        />
        {allowClear && value ? (
          <div className="mt-1 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
            >
              Clear
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function friendlyLabel(key: string): string {
  const today = todayKey();
  if (key === today) return "Today";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === toLocalDateKey(yesterday)) return "Yesterday";
  return formatLongDate(key);
}

function buildDisabled(min?: Date, max?: Date) {
  if (!min && !max) return undefined;
  return (day: Date) => {
    if (min && day < startOfDay(min)) return true;
    if (max && day > endOfDay(max)) return true;
    return false;
  };
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

// Selection-only picker styling: same primitive as the shared calendar
// (react-day-picker), but no activity dots or intensity — deliberately
// simpler and slightly more compact for form use.
const PICKER_CLASSES = {
  root: "text-foreground",
  months: "flex flex-col gap-2",
  month: "space-y-2",
  month_caption:
    "relative flex h-10 items-center justify-center px-10 text-sm font-medium",
  caption_label: "text-sm font-medium",
  nav: "absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 items-center justify-between px-1",
  button_previous:
    "grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  button_next:
    "grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  month_grid: "w-full border-collapse [table-layout:fixed]",
  weekdays: "",
  weekday:
    "py-1 text-center text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground",
  week: "",
  day: "relative p-0.5 text-center align-middle",
  day_button:
    "mx-auto grid h-9 w-9 place-items-center rounded-full text-[13px] font-medium leading-none transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  today: "[&_button]:ring-1 [&_button]:ring-gold/60",
  selected:
    "[&_button]:bg-gradient-to-br [&_button]:from-crimson [&_button]:to-crimson-deep [&_button]:text-white [&_button]:hover:brightness-105",
  outside: "text-muted-foreground/40",
  disabled: "opacity-40",
} as const;

function PickerChevron({ orientation, className }: ChevronProps) {
  const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
  return <Icon className={cn("h-4 w-4", className)} aria-hidden />;
}
