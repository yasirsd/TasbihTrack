"use client";
import * as React from "react";
import Link from "next/link";
import { ChevronRight, MoreHorizontal, Pause, Pin, PinOff, Play, Plus } from "lucide-react";
import { motion } from "motion/react";
import type { Tracker, ProgressEntry } from "@/lib/data/types";
import { computeTrackerStats } from "@/lib/calculations/progress";
import { computePace } from "@/lib/calculations/pace";
import { computeTodayTarget } from "@/lib/calculations/today-target";
import { formatNumber, formatPercent, formatSigned } from "@/lib/format";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useData } from "@/components/data/data-context";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function TrackerCard({
  tracker,
  entries,
  onAdd,
  onEdit,
}: {
  tracker: Tracker;
  entries: ProgressEntry[];
  onAdd: (trackerId: string) => void;
  onEdit: (t: Tracker) => void;
}) {
  const stats = computeTrackerStats(tracker, entries);
  const pace = computePace(tracker, entries);
  const { deleteTracker, updateTracker } = useData();
  const { toast } = useToast();

  async function handleDelete() {
    if (!confirm(`Delete "${tracker.name}" and all its entries? This cannot be undone.`)) return;
    await deleteTracker(tracker.id);
    toast({ title: "Goal deleted" });
  }

  const paused = tracker.status === "paused";
  const completed = tracker.status === "completed";
  const paceLabel = paceLabelFor(pace);
  const todayTarget = computeTodayTarget(tracker, entries);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-5 shadow-sm"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-crimson/5 to-transparent" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/app/tracker/${tracker.id}`}
              className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-foreground hover:underline"
            >
              {tracker.name}
            </Link>
            {tracker.isPinned && <Pin className="h-3.5 w-3.5 text-gold" aria-label="Pinned" />}
            {paused && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                Paused
              </span>
            )}
            {completed && (
              <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium text-gold-deep">
                Completed
              </span>
            )}
          </div>
          {tracker.arabicText && (
            <p lang="ar" dir="rtl" className="mt-1 text-lg text-muted-foreground/90">
              {tracker.arabicText}
            </p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="rounded-full p-2 text-muted-foreground hover:bg-muted"
              aria-label="Goal options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(tracker)}>Edit</DropdownMenuItem>
            <DropdownMenuItem
              onSelect={async () => {
                await updateTracker(tracker.id, { isPinned: !tracker.isPinned });
              }}
            >
              {tracker.isPinned ? (
                <>
                  <PinOff className="h-3.5 w-3.5" /> Unpin
                </>
              ) : (
                <>
                  <Pin className="h-3.5 w-3.5" /> Pin
                </>
              )}
            </DropdownMenuItem>
            {paused ? (
              <DropdownMenuItem
                onSelect={async () => {
                  await updateTracker(tracker.id, { status: "active" });
                  toast({ title: "Resumed" });
                }}
              >
                <Play className="h-3.5 w-3.5" /> Resume
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onSelect={async () => {
                  await updateTracker(tracker.id, { status: "paused" });
                  toast({ title: "Paused" });
                }}
              >
                <Pause className="h-3.5 w-3.5" /> Pause
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
            <DropdownMenuItem destructive onSelect={handleDelete}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="relative mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="hero-number text-3xl font-semibold sm:text-4xl">
              <AnimatedNumber value={stats.total} />
            </span>
            <span className="text-sm text-muted-foreground">
              / {formatNumber(tracker.targetCount)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatNumber(stats.remaining)} remaining
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-foreground tabular-nums">
            {formatPercent(stats.percent, stats.percent < 10 ? 1 : 0)}
          </div>
          {paceLabel && (
            <div className={`mt-1 text-[11px] ${paceLabel.className}`}>{paceLabel.text}</div>
          )}
        </div>
      </div>

      <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, stats.percent)}%` }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full bg-gradient-to-r from-gold via-crimson to-crimson-deep"
        />
      </div>

      {!completed && todayTarget.source !== "none" && todayTarget.target > 0 && (
        <div className="mt-3 flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">
            Today
            {stats.today > 0 && (
              <> · <span className="text-foreground">{formatSigned(stats.today)}</span></>
            )}
          </span>
          <span
            className={cn(
              "tabular-nums",
              todayTarget.reached ? "font-medium text-gold-deep" : "text-muted-foreground",
            )}
          >
            {formatNumber(todayTarget.todayCompleted)} / {formatNumber(todayTarget.target)}
            {todayTarget.reached && " ✓"}
          </span>
        </div>
      )}

      <div className="mt-5 flex items-center gap-2">
        <Button variant="crimson" onClick={() => onAdd(tracker.id)} className="flex-1">
          <Plus className="h-4 w-4" /> Add Progress
        </Button>
        <Button asChild variant="outline" size="icon" aria-label="Open goal">
          <Link href={`/app/tracker/${tracker.id}`}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </motion.article>
  );
}

function paceLabelFor(pace: ReturnType<typeof computePace>): { text: string; className: string } | null {
  switch (pace.status) {
    case "on_track":
      return { text: "On track", className: "text-muted-foreground" };
    case "ahead":
      return {
        text: `${formatNumber(pace.diffFromTarget ?? 0)} ahead`,
        className: "text-emerald-500",
      };
    case "behind":
      return {
        text: `${formatNumber(Math.abs(pace.diffFromTarget ?? 0))} behind`,
        className: "text-crimson",
      };
    default:
      return null;
  }
}
