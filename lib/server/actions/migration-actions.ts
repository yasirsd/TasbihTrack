"use server";

import "server-only";
import { z } from "zod";
import { query, withTransaction } from "@/lib/server/db";
import { requireUser } from "@/lib/server/session";
import { crossedMilestones } from "@/lib/calculations/milestones";
import { markCompleted } from "@/lib/server/tracker-helpers";

const localPayloadSchema = z.object({
  usernameNormalized: z.string(),
  trackers: z.array(
    z.object({
      externalId: z.string(),
      name: z.string().min(1),
      arabicText: z.string().optional(),
      description: z.string().optional(),
      targetCount: z.number().int().positive(),
      targetDate: z.string().optional(),
      status: z.enum(["active", "paused", "completed", "archived"]),
      sortOrder: z.number().int().optional(),
      startedAt: z.string().optional(),
      completedAt: z.string().optional(),
    }),
  ),
  entries: z.array(
    z.object({
      trackerExternalId: z.string(),
      amount: z.number().int().positive(),
      entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      note: z.string().optional(),
      createdAt: z.string().optional(),
    }),
  ),
});

export type LocalMigrationPayload = z.infer<typeof localPayloadSchema>;

export async function importLocalDataAction(
  payload: LocalMigrationPayload,
): Promise<{ trackers: number; entries: number }> {
  const user = await requireUser();
  const data = localPayloadSchema.parse(payload);

  const flag = (user.preferences as Record<string, unknown>)?.localMigrationCompletedAt;
  if (typeof flag === "string" && flag.length) {
    return { trackers: 0, entries: 0 };
  }

  const result = await withTransaction(async (client) => {
    const idMap = new Map<string, string>();
    let trackerCount = 0;
    let entryCount = 0;

    for (const t of data.trackers) {
      const nextOrder = await client.query<{ n: number }>(
        `select coalesce(max(sort_order) + 1, 0)::int as n
           from trackers where user_id = $1`,
        [user.id],
      );
      const inserted = await client.query<{ id: string }>(
        `insert into trackers
           (user_id, name, arabic_text, description, target_count, target_date, status, sort_order, started_at, completed_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,coalesce($9, now()),$10)
         returning id`,
        [
          user.id,
          t.name,
          t.arabicText ?? null,
          t.description ?? null,
          t.targetCount,
          t.targetDate ?? null,
          t.status,
          t.sortOrder ?? nextOrder.rows[0]?.n ?? 0,
          t.startedAt ?? null,
          t.completedAt ?? null,
        ],
      );
      idMap.set(t.externalId, inserted.rows[0].id);
      trackerCount++;
      await client.query(
        `insert into tracker_events (user_id, tracker_id, event_type, event_data)
         values ($1, $2, 'tracker_created', $3::jsonb)`,
        [
          user.id,
          inserted.rows[0].id,
          JSON.stringify({ target: t.targetCount, migrated: true }),
        ],
      );
    }

    // group entries by tracker to compute milestones in order
    const byTracker = new Map<string, typeof data.entries>();
    for (const e of data.entries) {
      const arr = byTracker.get(e.trackerExternalId);
      if (arr) arr.push(e);
      else byTracker.set(e.trackerExternalId, [e]);
    }
    for (const [externalId, list] of byTracker.entries()) {
      const trackerId = idMap.get(externalId);
      if (!trackerId) continue;
      const target = data.trackers.find((t) => t.externalId === externalId)?.targetCount ?? 0;
      const sorted = [...list].sort((a, b) =>
        (a.createdAt ?? a.entryDate).localeCompare(b.createdAt ?? b.entryDate),
      );
      let running = 0;
      for (const e of sorted) {
        await client.query(
          `insert into progress_entries (user_id, tracker_id, amount, entry_date, note, created_at)
           values ($1, $2, $3, $4, $5, coalesce($6, now()))`,
          [user.id, trackerId, e.amount, e.entryDate, e.note ?? null, e.createdAt ?? null],
        );
        entryCount++;
        const next = running + e.amount;
        const crossed = crossedMilestones(running, next, target);
        for (const pct of crossed) {
          await client.query(
            `insert into tracker_events (user_id, tracker_id, event_type, event_data)
             values ($1, $2, 'milestone_reached', $3::jsonb)
             on conflict do nothing`,
            [
              user.id,
              trackerId,
              JSON.stringify({ percent: pct, totalAtTime: next, targetAtTime: target }),
            ],
          );
        }
        running = next;
      }
      if (target > 0 && running >= target) {
        await markCompleted(client, user.id, trackerId, running);
      }
    }

    return { trackers: trackerCount, entries: entryCount };
  });

  await query(
    `update users
        set preferences = coalesce(preferences, '{}'::jsonb)
                       || jsonb_build_object('localMigrationCompletedAt', $2)
      where id = $1`,
    [user.id, new Date().toISOString()],
  );

  return result;
}
