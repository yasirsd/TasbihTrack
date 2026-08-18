"use server";

import "server-only";
import { query, queryOne, withTransaction } from "@/lib/server/db";
import { requireUser } from "@/lib/server/session";
import { trackerFromRow, type TrackerRow, entryFromRow, type EntryRow, eventFromRow, type EventRow } from "@/lib/server/serializers";
import { createTrackerSchema, updateTrackerSchema } from "@/lib/validation";
import type { CreateTrackerInput, ProgressEntry, Tracker, UpdateTrackerInput } from "@/lib/data/types";
import type { JourneyEvent } from "@/lib/data/journey-types";
import { crossedMilestones } from "@/lib/calculations/milestones";
import type { PoolClient } from "pg";
import { markCompleted, todayLocalKey } from "@/lib/server/tracker-helpers";
import crypto from "node:crypto";

export interface ListResult {
  trackers: Tracker[];
  entries: ProgressEntry[];
}

export async function listTrackersAction(): Promise<ListResult> {
  const user = await requireUser();
  const [t, e] = await Promise.all([
    query<TrackerRow>(
      `select * from trackers
        where user_id = $1 and deleted_at is null
        order by is_pinned desc, sort_order asc, created_at asc`,
      [user.id],
    ),
    query<EntryRow>(
      `select * from progress_entries
        where user_id = $1 and deleted_at is null
        order by entry_date desc, created_at desc`,
      [user.id],
    ),
  ]);
  return {
    trackers: t.map(trackerFromRow),
    entries: e.map(entryFromRow),
  };
}

export async function trackerEventsAction(trackerId: string): Promise<JourneyEvent[]> {
  const user = await requireUser();
  const rows = await query<EventRow>(
    `select e.*
       from tracker_events e
       join trackers t on t.id = e.tracker_id
      where e.tracker_id = $1 and t.user_id = $2
      order by e.occurred_at asc, e.created_at asc`,
    [trackerId, user.id],
  );
  return rows.map(eventFromRow);
}

export async function createTrackerAction(input: CreateTrackerInput): Promise<Tracker> {
  const user = await requireUser();
  const parsed = createTrackerSchema.parse(input);
  // Idempotency: caller may pass a stable client UUID for the current
  // submission lifecycle. A retried request with the same id is a no-op that
  // returns the existing row instead of creating a duplicate tracker.
  const id = parsed.clientId ?? crypto.randomUUID();
  return withTransaction(async (client) => {
    const nextOrder = await client.query<{ next_order: number }>(
      `select coalesce(max(sort_order) + 1, 0)::int as next_order
         from trackers where user_id = $1 and deleted_at is null`,
      [user.id],
    );
    const sort = nextOrder.rows[0]?.next_order ?? 0;
    const inserted = await client.query<TrackerRow>(
      `insert into trackers
         (id, user_id, name, arabic_text, description, target_count, daily_target, target_date, sort_order)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       on conflict (id) do nothing
       returning *`,
      [
        id,
        user.id,
        parsed.name,
        parsed.arabicText ?? null,
        parsed.description ?? null,
        parsed.targetCount,
        parsed.dailyTarget ?? null,
        parsed.targetDate ?? null,
        sort,
      ],
    );
    if (inserted.rowCount === 0) {
      // Retry of an already-persisted create — return the existing tracker
      // scoped to this user so a colliding id from another account 404s.
      const existing = await client.query<TrackerRow>(
        `select * from trackers where id = $1 and user_id = $2 and deleted_at is null`,
        [id, user.id],
      );
      if (existing.rowCount === 0) throw new Error("Tracker not found");
      return trackerFromRow(existing.rows[0]);
    }
    const tracker = inserted.rows[0];

    await client.query(
      `insert into tracker_events (user_id, tracker_id, event_type, event_data)
       values ($1, $2, 'tracker_created', $3::jsonb)`,
      [
        user.id,
        tracker.id,
        JSON.stringify({
          target: parsed.targetCount,
          dailyTarget: parsed.dailyTarget ?? null,
          targetDate: parsed.targetDate ?? null,
        }),
      ],
    );

    if (parsed.startingProgress && parsed.startingProgress > 0) {
      const today = todayLocalKey();
      await client.query(
        `insert into progress_entries (user_id, tracker_id, amount, entry_date, note)
         values ($1, $2, $3, $4, $5)`,
        [user.id, tracker.id, parsed.startingProgress, today, "Starting progress"],
      );
      await client.query(
        `insert into tracker_events (user_id, tracker_id, event_type, event_data)
         values ($1, $2, 'starting_progress', $3::jsonb)`,
        [user.id, tracker.id, JSON.stringify({ amount: parsed.startingProgress })],
      );
      const crossed = crossedMilestones(0, parsed.startingProgress, parsed.targetCount);
      for (const pct of crossed) {
        await insertMilestone(client, user.id, tracker.id, pct, parsed.startingProgress, parsed.targetCount);
      }
      if (parsed.startingProgress >= parsed.targetCount) {
        await markCompleted(client, user.id, tracker.id, parsed.startingProgress);
      }
    }

    // Refresh tracker to pick up any status updates
    const refreshed = await client.query<TrackerRow>(
      `select * from trackers where id = $1`,
      [tracker.id],
    );
    return trackerFromRow(refreshed.rows[0]);
  });
}

export async function updateTrackerAction(input: UpdateTrackerInput & { id: string }): Promise<Tracker> {
  const user = await requireUser();
  const parsed = updateTrackerSchema.parse(input);
  return withTransaction(async (client) => {
    const existing = await client.query<TrackerRow>(
      `select * from trackers where id = $1 and user_id = $2 and deleted_at is null`,
      [parsed.id, user.id],
    );
    if (existing.rowCount === 0) throw new Error("Tracker not found");
    const before = existing.rows[0];

    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    const set = (col: string, val: unknown) => {
      fields.push(`${col} = $${i++}`);
      values.push(val);
    };
    if (parsed.name !== undefined) set("name", parsed.name);
    if (parsed.arabicText !== undefined) set("arabic_text", parsed.arabicText || null);
    if (parsed.description !== undefined) set("description", parsed.description || null);
    if (parsed.targetCount !== undefined) set("target_count", parsed.targetCount);
    if (parsed.dailyTarget !== undefined) set("daily_target", parsed.dailyTarget);
    if (parsed.targetDate !== undefined) set("target_date", parsed.targetDate);
    if (parsed.isPinned !== undefined) set("is_pinned", parsed.isPinned);
    if (parsed.sortOrder !== undefined) set("sort_order", parsed.sortOrder);
    if (parsed.status !== undefined) {
      set("status", parsed.status);
      if (parsed.status === "completed" && !before.completed_at) {
        set("completed_at", new Date().toISOString());
      } else if (parsed.status === "active" && before.completed_at) {
        set("completed_at", null);
      }
    }

    if (fields.length === 0) return trackerFromRow(before);
    values.push(parsed.id);
    values.push(user.id);
    const idParam = `$${i++}`;
    const userParam = `$${i++}`;
    const updated = await client.query<TrackerRow>(
      `update trackers set ${fields.join(", ")}
         where id = ${idParam} and user_id = ${userParam}
       returning *`,
      values,
    );
    const after = updated.rows[0];

    // Event: target changed
    if (parsed.targetCount !== undefined && Number(before.target_count) !== parsed.targetCount) {
      const totalRow = await client.query<{ total: string | null }>(
        `select coalesce(sum(amount), 0)::text as total
           from progress_entries
          where tracker_id = $1 and deleted_at is null`,
        [parsed.id],
      );
      const totalAtTime = Number(totalRow.rows[0]?.total ?? 0);
      await client.query(
        `insert into tracker_events (user_id, tracker_id, event_type, event_data)
         values ($1, $2, 'target_changed', $3::jsonb)`,
        [
          user.id,
          parsed.id,
          JSON.stringify({
            oldTarget: Number(before.target_count),
            newTarget: parsed.targetCount,
            totalAtTime,
          }),
        ],
      );
    }

    if (
      parsed.dailyTarget !== undefined &&
      Number(before.daily_target ?? 0) !== Number(parsed.dailyTarget ?? 0)
    ) {
      await client.query(
        `insert into tracker_events (user_id, tracker_id, event_type, event_data)
         values ($1, $2, 'daily_target_changed', $3::jsonb)`,
        [
          user.id,
          parsed.id,
          JSON.stringify({
            oldDailyTarget: before.daily_target ? Number(before.daily_target) : null,
            newDailyTarget: parsed.dailyTarget,
          }),
        ],
      );
    }

    if (parsed.status !== undefined && parsed.status !== before.status) {
      const eventType = statusEventType(before.status, parsed.status);
      if (eventType) {
        await client.query(
          `insert into tracker_events (user_id, tracker_id, event_type, event_data)
           values ($1, $2, $3, '{}'::jsonb)`,
          [user.id, parsed.id, eventType],
        );
      }
    }

    return trackerFromRow(after);
  });
}

export async function deleteTrackerAction(id: string): Promise<void> {
  const user = await requireUser();
  await query(`delete from trackers where id = $1 and user_id = $2`, [id, user.id]);
}

export async function reorderTrackersAction(orderedIds: string[]): Promise<void> {
  const user = await requireUser();
  await withTransaction(async (client) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query(
        `update trackers set sort_order = $1
           where id = $2 and user_id = $3`,
        [i, orderedIds[i], user.id],
      );
    }
  });
}

function statusEventType(from: string, to: string): string | null {
  if (to === "paused") return "paused";
  if (from === "paused" && to === "active") return "resumed";
  if (to === "completed") return "completed";
  if (from === "completed" && to === "active") return "reopened";
  if (to === "archived") return "archived";
  if (from === "archived" && to === "active") return "restored";
  return null;
}

async function insertMilestone(
  client: PoolClient,
  userId: string,
  trackerId: string,
  percent: number,
  totalAtTime: number,
  targetAtTime: number,
): Promise<void> {
  await client.query(
    `insert into tracker_events (user_id, tracker_id, event_type, event_data)
     values ($1, $2, 'milestone_reached', $3::jsonb)
     on conflict do nothing`,
    [userId, trackerId, JSON.stringify({ percent, totalAtTime, targetAtTime })],
  );
}
