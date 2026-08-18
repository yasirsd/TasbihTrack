"use client";
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MoreHorizontal, Plus, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useData } from "@/components/data/data-context";
import { useAddSheet } from "@/components/navigation/add-sheet-context";
import { computeTrackerStats, groupByDay } from "@/lib/calculations/progress";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Button } from "@/components/ui/button";
import { formatNumber, formatPercent, formatSigned } from "@/lib/format";
import { formatRelativeDate } from "@/lib/date-utils";
import { EntryItem } from "@/components/entries/entry-item";
import { EditTrackerSheet } from "@/components/trackers/edit-tracker-sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";

export default function TrackerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { trackers, entries, updateTracker, deleteTracker } = useData();
  const { openAdd } = useAddSheet();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = React.useState(false);

  const tracker = trackers.find((t) => t.id === params.id);
  const trackerEntries = React.useMemo(
    () => entries.filter((e) => e.trackerId === params.id),
    [entries, params.id],
  );
  const stats = tracker ? computeTrackerStats(tracker, trackerEntries) : null;
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

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <Button asChild variant="ghost" size="icon">
          <Link href="/app/dashboard" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Goal options">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>Edit</DropdownMenuItem>
            {tracker.status === "archived" ? (
              <DropdownMenuItem
                onSelect={async () => {
                  await updateTracker(tracker.id, { status: "active" });
                  toast({ title: "Goal restored" });
                }}
              >
                Restore
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onSelect={async () => {
                  await updateTracker(tracker.id, { status: "archived" });
                  toast({ title: "Goal archived" });
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
      </header>

      <section className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{tracker.name}</h1>
        {tracker.arabicText && (
          <p dir="rtl" className="text-2xl text-muted-foreground/90">
            {tracker.arabicText}
          </p>
        )}
        {tracker.description && (
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

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile label="Completed" value={formatNumber(stats!.total)} />
        <SummaryTile label="Remaining" value={formatNumber(stats!.remaining)} />
        <SummaryTile label="Today" value={formatSigned(stats!.today)} />
        <SummaryTile label="This week" value={formatNumber(stats!.thisWeek)} />
      </section>

      {tracker.targetDate && (
        <section className="rounded-3xl border border-border/60 bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Pacing</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <div>
              <span className="text-2xl font-semibold">{stats!.daysRemaining ?? 0}</span>
              <span className="ml-1 text-sm text-muted-foreground">days left</span>
            </div>
            {stats!.requiredPerDay !== null && stats!.remaining > 0 && (
              <div>
                <span className="text-2xl font-semibold">≈ {formatNumber(stats!.requiredPerDay)}</span>
                <span className="ml-1 text-sm text-muted-foreground">per day needed</span>
              </div>
            )}
          </div>
        </section>
      )}

      <Button variant="crimson" size="lg" className="w-full" onClick={() => openAdd(tracker.id)}>
        <Plus className="h-5 w-5" /> Add Progress
      </Button>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Activity
        </h2>
        {grouped.length === 0 ? (
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
        )}
      </section>

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
