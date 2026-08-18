"use server";

import "server-only";
import crypto from "node:crypto";
import { withTransaction } from "@/lib/server/db";
import { requireUser } from "@/lib/server/session";
import { entryFromRow, type EntryRow, type TrackerRow } from "@/lib/server/serializers";
import { createEntrySchema, updateEntrySchema } from "@/lib/validation";
import type { CreateEntryInput, CreateEntryResult, ProgressEntry, UpdateEntryInput } from "@/lib/data/types";
import { crossedMilestones } from "@/lib/calculations/milestones";
import type { PoolClient } from "pg";
import { markCompleted, todayLocalKey } from "@/lib/server/tracker-helpers";

export async function createEntryAction(input: CreateEntryInput): Promise<CreateEntryResult> {
  const user = await requireUser();
  const parsed = createEntrySchema.parse(input);
  // Idempotency: if the client provides a UUID (offline-queue flush,
  // retried mutation), we insert with that id and ON CONFLICT DO NOTHING.
  // A repeat of the same id is a no-op and returns the existing row with
  // newMilestones=[] so no celebration replays.
  const id = parsed.clientId ?? crypto.randomUUID();
  return withTransaction(async (client) => {
    const trackerRow = await client.query<TrackerRow>(
      `select * from trackers where id = $1 and user_id = $2 and deleted_at is null for update`,
      [parsed.trackerId, user.id],
    );
    if (trackerRow.rowCount === 0) throw new Error("Tracker not found");
    const tracker = trackerRow.rows[0];
    const prevTotal = await totalForTrackerInTx(client, parsed.trackerId);
    const insert = await client.query<EntryRow>(
      `insert into progress_entries (id, user_id, tracker_id, amount, entry_date, note)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (id) do nothing
       returning *`,
      [
        id,
        user.id,
        parsed.trackerId,
        parsed.amount,
        parsed.entryDate ?? todayLocalKey(),
        parsed.note ?? null,
      ],
    );
    if (insert.rowCount === 0) {
      const existing = await client.query<EntryRow>(
        `select * from progress_entries where id = $1 and user_id = $2 and deleted_at is null`,
        [id, user.id],
      );
      if (existing.rowCount === 0) throw new Error("Entry not found");
      return { entry: entryFromRow(existing.rows[0]), newMilestones: [], completed: false };
    }
    const nextTotal = prevTotal + parsed.amount;
    const target = Number(tracker.target_count);
    const crossed = crossedMilestones(prevTotal, nextTotal, target);
    // Filter out 100 — completion is reported separately so the client can
    // route it to the completion celebration flow rather than a milestone one.
    const newMilestones: number[] = [];
    for (const pct of crossed) {
      const inserted = await client.query(
        `insert into tracker_events (user_id, tracker_id, event_type, event_data)
         values ($1, $2, 'milestone_reached', $3::jsonb)
         on conflict do nothing`,
        [
          user.id,
          parsed.trackerId,
          JSON.stringify({ percent: pct, totalAtTime: nextTotal, targetAtTime: target }),
        ],
      );
      if (inserted.rowCount && inserted.rowCount > 0 && pct < 100) newMilestones.push(pct);
    }
    let completed = false;
    if (nextTotal >= target && tracker.status === "active") {
      await markCompleted(client, user.id, parsed.trackerId, nextTotal);
      completed = true;
    }
    return {
      entry: entryFromRow(insert.rows[0]),
      newMilestones,
      completed,
    };
  });
}

export async function updateEntryAction(input: UpdateEntryInput & { id: string }): Promise<ProgressEntry> {
  const user = await requireUser();
  const parsed = updateEntrySchema.parse(input);
  return withTransaction(async (client) => {
    const existing = await client.query<EntryRow>(
      `select * from progress_entries where id = $1 and user_id = $2 and deleted_at is null`,
      [parsed.id, user.id],
    );
    if (existing.rowCount === 0) throw new Error("Entry not found");
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (parsed.amount !== undefined) {
      fields.push(`amount = $${i++}`);
      values.push(parsed.amount);
    }
    if (parsed.entryDate !== undefined) {
      fields.push(`entry_date = $${i++}`);
      values.push(parsed.entryDate);
    }
    if (parsed.note !== undefined) {
      fields.push(`note = $${i++}`);
      values.push(parsed.note);
    }
    if (fields.length === 0) return entryFromRow(existing.rows[0]);
    values.push(parsed.id);
    values.push(user.id);
    const updated = await client.query<EntryRow>(
      `update progress_entries set ${fields.join(", ")}
         where id = $${i++} and user_id = $${i++}
       returning *`,
      values,
    );
    return entryFromRow(updated.rows[0]);
  });
}

export async function deleteEntryAction(id: string): Promise<void> {
  const user = await requireUser();
  await withTransaction(async (client) => {
    await client.query(
      `delete from progress_entries where id = $1 and user_id = $2`,
      [id, user.id],
    );
  });
}

async function totalForTrackerInTx(client: PoolClient, trackerId: string): Promise<number> {
  const row = await client.query<{ total: string | null }>(
    `select coalesce(sum(amount), 0)::text as total
       from progress_entries
      where tracker_id = $1 and deleted_at is null`,
    [trackerId],
  );
  return Number(row.rows[0]?.total ?? 0);
}
