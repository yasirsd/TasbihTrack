"use client";
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Focus, MoreHorizontal, Pause, Play, Plus, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useData } from "@/components/data/data-context";
import { useAddSheet } from "@/components/navigation/add-sheet-context";
import { computeTrackerStats, groupByDay } from "@/lib/calculations/progress";
import { computePace } from "@/lib/calculations/pace";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Button } from "@/components/ui/button";
import { formatNumber, formatPercent, formatSigned } from "@/lib/format";
import { formatRelativeDate } from "@/lib/date-utils";
import { EntryItem } from "@/components/entries/entry-item";
import { EditTrackerSheet } from "@/components/trackers/edit-tracker-sheet";
import { JourneyView } from "@/components/tracker/journey-view";
import { CalendarView } from "@/components/history/calendar-view";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Tab = "activity" | "journey" | "calendar";

export default function TrackerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { trackers, entries, updateTracker, deleteTracker } = useData();
  const { openAdd } = useAddSheet();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = React.useState(false);
  const [tab, setTab] = React.useState<Tab>("activity");
  const [focused, setFocused] = React.useState(false);

  const tracker = trackers.find((t) => t.id === params.id);
  const trackerEntries = React.useMemo(
    () => entries.filter((e) => e.trackerId === params.id),
    [entries, params.id],
  );
  const stats = tracker ? computeTrackerStats(tracker, trackerEntries) : null;
  const pace = tracker ? computePace(tracker, trackerEntries) : null;
  const grouped = React.useMemo(() => groupByDay(trackerEntries), [trackerEntries]);

  if (!tracker) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-center">
        <div className="space-y-3">
          <p className="text-lg font-medium">This goal isn't here.</p>
          <p className="text-sm text-muted-foreground">It may have been deleted.</p>
          <Button asChild variant="outline">
            <Link href="/app/dashboard"><ArrowLeft className="h-4 w-4" /> Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const paceStatus = pace?.status;
  const paceLabel =
    paceStatus === "ahead"
      ? `${formatNumber(pace!.diffFromTarget ?? 0)} ahead`
      : paceStatus === "behind"
        ? `${formatNumber(Math.abs(pace!.diffFromTarget ?? 0))} behind`
        : paceStatus === "on_track"
          ? "On track"
          : null;
  const paceClass =
    paceStatus === "ahead"
      ? "text-emerald-500"
      : paceStatus === "behind"
        ? "text-crimson"
        : "text-muted-foreground";

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <Button asChild variant="ghost" size="icon">
          <Link href="/app/dashboard" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Focus mode"
            onClick={() => setFocused((v) => !v)}
          >
            <Focus className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Goal options">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEditOpen(true)}>Edit</DropdownMenuItem>
              {tracker.status === "paused" ? (
                <DropdownMenuItem
                  onSelect={async () => {
                    await updateTracker(tracker.id, { status: "active" });
                    toast({ title: "Resumed" });
                  }}
                >
                  <Play className="h-3.5 w-3.5" /> Resume
                </DropdownMenuItem>
              ) : tracker.status !== "completed" && tracker.status !== "archived" ? (
                <DropdownMenuItem
                  onSelect={async () => {
                    await updateTracker(tracker.id, { status: "paused" });
                    toast({ title: "Paused" });
                  }}
                >
                  <Pause className="h-3.5 w-3.5" /> Pause
                </DropdownMenuItem>
              ) : null}
              {tracker.status === "completed" && (
                <DropdownMenuItem
                  onSelect={async () => {
                    await updateTracker(tracker.id, { status: "active" });
                    toast({ title: "Reopened" });
                  }}
                >
                  Reopen goal
                </DropdownMenuItem>
              )}
              {tracker.status === "archived" ? (
                <DropdownMenuItem
                  onSelect={async () => {
                    await updateTracker(tracker.id, { status: "active" });
                    toast({ title: "Restored" });
                  }}
                >
                  Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onSelect={async () => {
                    await updateTracker(tracker.id, { status: "archived" });
                    toast({ title: "Archived" });
                  }}
                >
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                destructive
                onSelect={async () => {
                  if (!confirm(`Delete "${tracker.name}" and all entries?`)) return;
                  await deleteTracker(tracker.id);
                  toast({ title: "Goal deleted" });
                  router.replace("/app/dashboard");
                }}
              >
                Delete goal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <section className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{tracker.name}</h1>
        {tracker.arabicText && (
          <p dir="rtl" className="text-2xl text-muted-foreground/90">
            {tracker.arabicText}
          </p>
        )}
        {tracker.description && !focused && (
          <p className="max-w-md text-sm text-muted-foreground">{tracker.description}</p>
        )}
      </section>

      <section className="flex flex-col items-center gap-4">
        <ProgressRing percent={stats!.percent} size={260}>
          <div className="text-center">
            <div className="hero-number text-5xl font-semibold">
              <AnimatedNumber value={stats!.total} />
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              of {formatNumber(tracker.targetCount)}
            </div>
            <div className="mt-2 text-xs font-medium text-crimson">
              {formatPercent(stats!.percent, stats!.percent < 10 ? 1 : 0)}
            </div>
          </div>
        </ProgressRing>
        {stats!.total > tracker.targetCount && (
          <div className="text-xs text-muted-foreground">
            Goal exceeded by {formatNumber(stats!.total - tracker.targetCount)}
          </div>
        )}
        {stats!.isCompleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 rounded-full bg-gold/15 px-4 py-1.5 text-sm font-medium text-gold-deep"
          >
            <Sparkles className="h-4 w-4" /> Alhamdulillah — goal completed
          </motion.div>
        )}
      </section>

      {!focused && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryTile label="Completed" value={formatNumber(stats!.total)} />
          <SummaryTile label="Remaining" value={formatNumber(stats!.remaining)} />
          <SummaryTile label="Today" value={formatSigned(stats!.today)} />
          <SummaryTile label="This week" value={formatNumber(stats!.thisWeek)} />
        </section>
      )}

      {!focused && tracker.dailyTarget && (
        <section className="rounded-3xl border border-border/60 bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Daily target</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums">
              {formatNumber(stats!.today)}
            </span>
            <span className="text-sm text-muted-foreground">
              / {formatNumber(tracker.dailyTarget)}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold via-crimson to-crimson-deep"
              style={{
                width: `${Math.min(100, (stats!.today / tracker.dailyTarget) * 100)}%`,
              }}
            />
          </div>
        </section>
      )}

      {!focused && tracker.targetDate && pace && pace.requiredPerDay !== null && (
        <section className="rounded-3xl border border-border/60 bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Pacing</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <div>
              <span className="text-2xl font-semibold">{stats!.daysRemaining ?? 0}</span>
              <span className="ml-1 text-sm text-muted-foreground">days left</span>
            </div>
            {pace.requiredPerDay > 0 && (
              <div>
                <span className="text-2xl font-semibold">
                  ≈ {formatNumber(pace.requiredPerDay)}
                </span>
                <span className="ml-1 text-sm text-muted-foreground">per day needed</span>
              </div>
            )}
          </div>
          {paceLabel && <p className={`mt-2 text-sm ${paceClass}`}>{paceLabel}</p>}
          {pace.estimatedCompletionKey && (
            <p className="mt-1 text-xs text-muted-foreground">
              At your current pace, ≈ {formatRelativeDate(pace.estimatedCompletionKey)}
            </p>
          )}
        </section>
      )}

      <Button variant="crimson" size="lg" className="w-full" onClick={() => openAdd(tracker.id)}>
        <Plus className="h-5 w-5" /> Add Progress
      </Button>

      {!focused && (
        <section>
          <div role="tablist" className="mb-3 flex gap-1 rounded-full border border-border/50 bg-muted/30 p-1">
            {(
              [
                ["activity", "Activity"],
                ["journey", "Journey"],
                ["calendar", "Calendar"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn(
                  "flex-1 rounded-full px-3 py-1.5 text-xs transition-colors",
                  tab === id
                    ? "bg-background text-foreground shadow"
                    : "text-muted-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "activity" && (
            grouped.length === 0 ? (
              <p className="rounded-3xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
                No entries yet. Add your first progress above.
              </p>
            ) : (
              <div className="space-y-4">
                {grouped.map((group) => (
                  <div key={group.key} className="rounded-3xl border border-border/60 bg-card p-4">
                    <div className="mb-2 flex items-baseline justify-between">
                      <p className="text-sm font-medium">{formatRelativeDate(group.key)}</p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        +{formatNumber(group.total)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      {group.entries.map((e) => (
                        <EntryItem key={e.id} entry={e} tracker={tracker} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === "journey" && <JourneyView tracker={tracker} />}
          {tab === "calendar" && <CalendarView trackerId={tracker.id} />}
        </section>
      )}

      <EditTrackerSheet tracker={tracker} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
