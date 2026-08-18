"use client";
import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Archive, Plus } from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { useData } from "@/components/data/data-context";
import { useAddSheet } from "@/components/navigation/add-sheet-context";
import { TodaySummary } from "@/components/dashboard/today-summary";
import { TrackerCard } from "@/components/dashboard/tracker-card";
import { DashboardEmpty } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { EditTrackerSheet } from "@/components/trackers/edit-tracker-sheet";
import type { Tracker } from "@/lib/data/types";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Peace be with you";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Peaceful night";
}

export default function DashboardPage() {
  const { session } = useAuth();
  const { trackers, entries, loading } = useData();
  const { openAdd, openCreate } = useAddSheet();
  const [editing, setEditing] = React.useState<Tracker | null>(null);

  const active = trackers.filter(
    (t) => t.status === "active" || t.status === "paused",
  );
  const completed = trackers.filter((t) => t.status === "completed");
  const archived = trackers.filter((t) => t.status === "archived");
  const displayed = [...active, ...completed];

  return (
    <div className="space-y-6">
      <motion.header
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-sm text-muted-foreground">Assalamu Alaikum,</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {session?.user.username ?? "Friend"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{greeting()}.</p>
      </motion.header>

      <TodaySummary entries={entries} trackers={trackers} />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Active Goals
          </h2>
          {displayed.length > 0 && (
            <Button variant="ghost" size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" /> New
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-3xl bg-muted/40" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <DashboardEmpty onCreate={openCreate} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {displayed.map((t) => (
              <TrackerCard
                key={t.id}
                tracker={t}
                entries={entries}
                onAdd={(id) => openAdd(id)}
                onEdit={(tr) => setEditing(tr)}
              />
            ))}
          </div>
        )}
      </section>

      {archived.length > 0 && (
        <section>
          <Link
            href="/app/archive"
            className="flex items-center justify-between rounded-2xl border border-border/60 bg-card p-4 hover:bg-muted/30"
          >
            <div>
              <p className="text-sm font-medium">Past Journeys</p>
              <p className="text-xs text-muted-foreground">
                {archived.length} archived {archived.length === 1 ? "goal" : "goals"}
              </p>
            </div>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </Link>
        </section>
      )}

      <EditTrackerSheet
        tracker={editing}
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
      />
    </div>
  );
}
