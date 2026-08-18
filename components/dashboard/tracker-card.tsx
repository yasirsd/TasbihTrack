"use client";
import * as React from "react";
import Link from "next/link";
import { ChevronRight, MoreHorizontal, Plus } from "lucide-react";
import { motion } from "motion/react";
import type { Tracker, ProgressEntry } from "@/lib/data/types";
import { computeTrackerStats } from "@/lib/calculations/progress";
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
  const { deleteTracker, updateTracker } = useData();
  const { toast } = useToast();

  async function handleDelete() {
    if (!confirm(`Delete "${tracker.name}" and all its entries? This cannot be undone.`)) return;
    await deleteTracker(tracker.id);
    toast({ title: "Goal deleted" });
  }

  async function handleArchive() {
    await updateTracker(tracker.id, { status: "archived" });
    toast({ title: "Goal archived" });
  }

  async function handleRestore() {
    await updateTracker(tracker.id, { status: "active" });
    toast({ title: "Goal restored" });
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-5 shadow-sm"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-crimson/5 to-transparent" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <Link
            href={`/app/tracker/${tracker.id}`}
            className="text-base font-semibold tracking-tight text-foreground hover:underline"
          >
            {tracker.name}
          </Link>
          {tracker.arabicText && (
            <p dir="rtl" className="mt-1 text-lg text-muted-foreground/90">
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
            {tracker.status === "archived" ? (
              <DropdownMenuItem onSelect={handleRestore}>Restore</DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={handleArchive}>Archive</DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={handleDelete}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="relative mt-4 flex items-end justify-between gap-3">
        <div>
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
            {stats.today > 0 && <> · <span className="text-foreground">{formatSigned(stats.today)} today</span></>}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-foreground">{formatPercent(stats.percent, stats.percent < 10 ? 1 : 0)}</div>
          {tracker.status === "completed" && (
            <div className="mt-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium text-gold-deep">
              Completed
            </div>
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
