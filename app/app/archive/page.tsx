"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { useData } from "@/components/data/data-context";
import { computeTrackerStats } from "@/lib/calculations/progress";
import { formatNumber, formatPercent } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
          <h1 className="text-2xl font-semibold tracking-tight">Past Journeys</h1>
          <p className="text-sm text-muted-foreground">Completed and archived goals.</p>
        </div>
      </header>

      {past.length > 3 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search past journeys"
            className="pl-10"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
          {past.length === 0
            ? "Your completed goals will live here."
            : "No matches."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const s = computeTrackerStats(t, entries);
            return (
              <Link
                key={t.id}
                href={`/app/tracker/${t.id}`}
                className="block rounded-3xl border border-border/60 bg-card p-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-baseline justify-between">
                  <p className="text-base font-medium">{t.name}</p>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t.status}
                  </span>
                </div>
                <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                  {formatNumber(s.total)} / {formatNumber(t.targetCount)} · {formatPercent(s.percent, 0)}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
