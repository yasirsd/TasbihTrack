"use client";
import * as React from "react";
import { motion } from "motion/react";
import {
  Award,
  CheckCircle2,
  Clock,
  Flag,
  Milestone,
  Pause,
  Play,
  Rewind,
  RotateCcw,
  Sparkles,
  Target,
} from "lucide-react";
import { cloudRepositories } from "@/lib/data/cloud/cloud-repositories";
import type { JourneyEvent } from "@/lib/data/journey-types";
import { formatLongDate, toLocalDateKey } from "@/lib/date-utils";
import { formatNumber, formatPercent } from "@/lib/format";
import type { Tracker } from "@/lib/data/types";

export function JourneyView({ tracker }: { tracker: Tracker }) {
  const [events, setEvents] = React.useState<JourneyEvent[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    cloudRepositories
      .trackerEvents(tracker.id)
      .then((e) => {
        if (!cancelled) setEvents(e);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load journey.");
      });
    return () => {
      cancelled = true;
    };
  }, [tracker.id]);

  if (error) return <p className="text-sm text-muted-foreground">{error}</p>;
  if (!events) return <div className="h-24 animate-pulse rounded-2xl bg-muted/30" />;
  if (events.length === 0) {
    return (
      <p className="rounded-2xl border border-border/60 bg-card p-4 text-sm text-muted-foreground">
        The journey begins as soon as you log progress.
      </p>
    );
  }

  return (
    <ol className="relative space-y-4">
      <div className="pointer-events-none absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-gold/40 via-crimson/30 to-transparent" />
      {events.map((event, i) => (
        <JourneyItem key={event.id} event={event} delay={i * 0.03} />
      ))}
    </ol>
  );
}

function JourneyItem({ event, delay }: { event: JourneyEvent; delay: number }) {
  const { icon: Icon, title, description, tone } = describeEvent(event);
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative pl-12"
    >
      <span
        className={`absolute left-0 top-0 grid h-10 w-10 place-items-center rounded-full border border-border/60 ${tone}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
        <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
          {formatLongDate(toLocalDateKey(event.occurredAt))}
        </p>
      </div>
    </motion.li>
  );
}

function describeEvent(e: JourneyEvent): {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  tone: string;
} {
  const data = e.data as {
    percent?: number;
    totalAtTime?: number;
    targetAtTime?: number;
    oldTarget?: number;
    newTarget?: number;
    amount?: number;
    oldDailyTarget?: number | null;
    newDailyTarget?: number | null;
  };
  switch (e.type) {
    case "tracker_created":
      return {
        icon: Sparkles,
        title: "Journey began",
        description: undefined,
        tone: "bg-gold/10 text-gold-deep",
      };
    case "starting_progress":
      return {
        icon: Flag,
        title: "Starting progress",
        description: data.amount ? `+${formatNumber(data.amount)}` : undefined,
        tone: "bg-muted text-foreground",
      };
    case "milestone_reached":
      return {
        icon: Milestone,
        title: `${formatPercent(data.percent ?? 0, 0)} reached`,
        description:
          data.totalAtTime !== undefined && data.targetAtTime !== undefined
            ? `${formatNumber(data.totalAtTime)} of ${formatNumber(data.targetAtTime)}`
            : undefined,
        tone: "bg-crimson/10 text-crimson",
      };
    case "target_changed":
      return {
        icon: Target,
        title: "Target changed",
        description:
          data.oldTarget !== undefined && data.newTarget !== undefined
            ? `${formatNumber(data.oldTarget)} → ${formatNumber(data.newTarget)}`
            : undefined,
        tone: "bg-muted text-foreground",
      };
    case "daily_target_changed":
      return {
        icon: Target,
        title: "Daily target changed",
        description:
          data.newDailyTarget !== undefined
            ? `${data.oldDailyTarget ? formatNumber(data.oldDailyTarget) : "None"} → ${data.newDailyTarget ? formatNumber(data.newDailyTarget) : "None"}`
            : undefined,
        tone: "bg-muted text-foreground",
      };
    case "paused":
      return { icon: Pause, title: "Paused", tone: "bg-muted text-muted-foreground" };
    case "resumed":
      return { icon: Play, title: "Resumed", tone: "bg-muted text-foreground" };
    case "completed":
      return {
        icon: CheckCircle2,
        title: "Alhamdulillah — goal completed",
        description:
          data.totalAtTime !== undefined ? `${formatNumber(data.totalAtTime)} total` : undefined,
        tone: "bg-gold/15 text-gold-deep",
      };
    case "reopened":
      return {
        icon: Rewind,
        title: "Reopened after completion",
        tone: "bg-muted text-foreground",
      };
    case "archived":
      return { icon: Award, title: "Archived", tone: "bg-muted text-muted-foreground" };
    case "restored":
      return { icon: RotateCcw, title: "Restored", tone: "bg-muted text-foreground" };
    default:
      return { icon: Clock, title: e.type, tone: "bg-muted text-muted-foreground" };
  }
}
