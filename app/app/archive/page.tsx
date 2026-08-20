"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Award, ChevronRight, Search } from "lucide-react";
import { useData } from "@/components/data/data-context";
import { computeTrackerStats } from "@/lib/calculations/progress";
import { formatNumber, formatPercent } from "@/lib/format";
import { formatRelativeDate, toLocalDateKey } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function ArchivePage() {
  const { trackers, entries } = useData();
  const [query, setQuery] = React.useState("");

  const past = trackers.filter(
    (t) => t.status === "archived" || t.status === "completed",
  );
  const filtered = query
    ? past.filter((t) =>
        `${t.name} ${t.arabicText ?? ""}`.toLowerCase().includes(query.toLowerCase()),
      )
    : past;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" aria-label="Back">
          <Link href="/app/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Past journeys</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Goals worth revisiting.
          </p>
        </div>
      </header>

      {past.length > 3 && (
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search past journeys"
            className="pl-10"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="clay-card rounded-3xl border border-border/60 bg-card p-10 text-center">
          <Award className="mx-auto h-8 w-8 text-muted-foreground/40" aria-hidden />
          <p className="mt-3 text-sm font-medium">
            {past.length === 0
              ? "Your completed goals will live here."
              : "No matches."}
          </p>
          {past.length === 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Complete or archive a goal to see it here.
            </p>
          )}
        </div>
      ) : (
        <ul className="clay-card divide-y divide-border/40 overflow-hidden rounded-3xl border border-border/60 bg-card">
          {filtered.map((t) => {
            const s = computeTrackerStats(t, entries);
            const closedAt = t.completedAt
              ? formatRelativeDate(toLocalDateKey(t.completedAt))
              : null;
            return (
              <li key={t.id}>
                <Link
                  href={`/app/tracker/${t.id}`}
                  className={cn(
                    "group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/30",
                    "focus-visible:bg-muted/40 focus-visible:outline-none",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[15px] font-medium">{t.name}</p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                          t.status === "completed"
                            ? "bg-gold/15 text-gold-deep"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {t.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                      {formatNumber(s.total)} / {formatNumber(t.targetCount)} ·{" "}
                      {formatPercent(s.percent, 0)}
                      {closedAt && (
                        <span> · {t.status === "completed" ? "completed" : "archived"} {closedAt}</span>
                      )}
                    </p>
                  </div>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
