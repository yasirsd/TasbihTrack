"use server";

import "server-only";
import { z } from "zod";
import { withTransaction } from "@/lib/server/db";
import { requireUser, AuthError } from "@/lib/server/session";
import { crossedMilestones } from "@/lib/calculations/milestones";
import { markCompleted } from "@/lib/server/tracker-helpers";

// ---------------------------------------------------------------------------
// Payload schema
//
// Legacy Phase-1 data may contain undefined / null / empty-string for optional
// fields. Server Action serialization can also turn undefined into null on the
// wire. We use `.nullish()` (accepts both) and normalize inside the action.
// ---------------------------------------------------------------------------

const STATUS_VALUES = ["active", "paused", "completed", "archived"] as const;

const nullishString = z.string().nullish();

const localTrackerSchema = z.object({
  externalId: z.string().min(1),
  name: z.string().min(1).max(120),
  arabicText: nullishString,
  description: nullishString,
  targetCount: z.number().int().positive(),
  targetDate: nullishString,
  // Legacy shape may include statuses outside our current enum; parse loosely
  // and normalize below.
  status: z.string().nullish(),
  sortOrder: z.number().int().nullish(),
  startedAt: nullishString,
  completedAt: nullishString,
});

const localEntrySchema = z.object({
  trackerExternalId: z.string().min(1),
  amount: z.number().int().positive(),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "entry_date must be YYYY-MM-DD"),
  note: nullishString,
  createdAt: nullishString,
});

const localPayloadSchema = z.object({
  usernameNormalized: z.string(),
  trackers: z.array(localTrackerSchema),
  entries: z.array(localEntrySchema),
});

export type LocalMigrationPayload = z.infer<typeof localPayloadSchema>;

// ---------------------------------------------------------------------------
// Typed result — the action NEVER throws for user-visible failures.
// The client can distinguish success vs failure without relying on Next.js's
// production-masked exception messages.
// ---------------------------------------------------------------------------

export type MigrationResult =
  | { success: true; trackers: number; entries: number }
  | { success: false; code: MigrationErrorCode; message: string };

export type MigrationErrorCode =
  | "unauthorized"
  | "already_migrated"
  | "invalid_payload"
  | "empty"
  | "internal";

function fail(code: MigrationErrorCode, message: string): MigrationResult {
  return { success: false, code, message };
}

function normalizeStatus(raw: string | null | undefined): (typeof STATUS_VALUES)[number] {
  if (typeof raw !== "string") return "active";
  const lower = raw.toLowerCase().trim();
  if ((STATUS_VALUES as readonly string[]).includes(lower))
    return lower as (typeof STATUS_VALUES)[number];
  return "active";
}

function normalizeText(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function normalizeDate(raw: string | null | undefined): string | null {
  const trimmed = normalizeText(raw);
  if (!trimmed) return null;
  // Accept full ISO timestamps or YYYY-MM-DD; slice to date-part for `date`
  // columns so a legacy value like "2026-08-27T00:00:00.000Z" doesn't drift.
  const match = trimmed.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

function normalizeTimestamp(raw: string | null | undefined): string | null {
  const trimmed = normalizeText(raw);
  if (!trimmed) return null;
  // Validate the shape without hitting the DB — an invalid string here would
  // become a raw pg parse error downstream.
  const t = Date.parse(trimmed);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

export async function importLocalDataAction(
  payload: unknown,
): Promise<MigrationResult> {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof AuthError)
      return fail("unauthorized", "Please sign in and try again.");
    console.error("importLocalDataAction: unexpected auth error", err);
    return fail("internal", "We couldn't import your local progress.");
  }

  const parsed = localPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    console.error(
      "importLocalDataAction: invalid payload",
      parsed.error.issues.slice(0, 5),
    );
    return fail(
      "invalid_payload",
      "That local data looks unfamiliar. Nothing was changed.",
    );
  }
  const data = parsed.data;

  if (data.trackers.length === 0) {
    return fail("empty", "Nothing to import.");
  }

  const alreadyMigrated =
    typeof (user.preferences as Record<string, unknown> | null)?.localMigrationCompletedAt ===
    "string";
  if (alreadyMigrated) {
    return fail("already_migrated", "This device's local progress has already been imported.");
  }

  try {
    const result = await withTransaction(async (client) => {
      // Serialize concurrent flag writes for this user — if two tabs race,
      // the second waits and then sees the flag already set (below).
      await client.query(`select pg_advisory_xact_lock(hashtext($1))`, [user.id]);

      // Re-check the flag from the DB inside the tx to close a race window.
      const freshFlagRow = await client.query<{ flag: string | null }>(
        `select (preferences->>'localMigrationCompletedAt') as flag
           from users where id = $1
           for update`,
        [user.id],
      );
      if (freshFlagRow.rows[0]?.flag) {
        return { ok: false as const, code: "already_migrated" as const };
      }

      const idMap = new Map<string, string>();
      let trackerCount = 0;
      let entryCount = 0;

      // Determine the starting sort_order once (all migrated trackers keep a
      // stable relative order from the legacy sortOrder, offset by current
      // max).
      const baseOrderRow = await client.query<{ n: number }>(
        `select coalesce(max(sort_order) + 1, 0)::int as n
           from trackers where user_id = $1`,
        [user.id],
      );
      const baseOrder = Number(baseOrderRow.rows[0]?.n ?? 0);

      for (const t of data.trackers) {
        const startedAt = normalizeTimestamp(t.startedAt);
        const completedAt = normalizeTimestamp(t.completedAt);
        const targetDate = normalizeDate(t.targetDate);
        const status = normalizeStatus(t.status);
        const arabic = normalizeText(t.arabicText);
        const description = normalizeText(t.description);
        const legacyOrder = typeof t.sortOrder === "number" ? t.sortOrder : 0;

        const inserted = await client.query<{ id: string }>(
          `insert into trackers
             (user_id, name, arabic_text, description, target_count, target_date,
              status, sort_order, started_at, completed_at)
           values ($1, $2, $3, $4, $5, $6, $7, $8, coalesce($9::timestamptz, now()), $10::timestamptz)
           returning id`,
          [
            user.id,
            t.name.trim(),
            arabic,
            description,
            t.targetCount,
            targetDate,
            status,
            baseOrder + legacyOrder,
            startedAt,
            completedAt,
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

      // Group entries by tracker externalId and insert in creation order so
      // milestones cross in the right sequence.
      const byTracker = new Map<string, typeof data.entries>();
      for (const e of data.entries) {
        const arr = byTracker.get(e.trackerExternalId);
        if (arr) arr.push(e);
        else byTracker.set(e.trackerExternalId, [e]);
      }
      for (const [externalId, list] of byTracker.entries()) {
        const trackerId = idMap.get(externalId);
        if (!trackerId) continue; // orphan entry — skip, not fatal
        const target =
          data.trackers.find((t) => t.externalId === externalId)?.targetCount ?? 0;
        const sorted = [...list].sort((a, b) => {
          const aKey = (a.createdAt ?? a.entryDate) as string;
          const bKey = (b.createdAt ?? b.entryDate) as string;
          return aKey.localeCompare(bKey);
        });
        let running = 0;
        for (const e of sorted) {
          const createdAt = normalizeTimestamp(e.createdAt);
          const note = normalizeText(e.note);
          await client.query(
            `insert into progress_entries
               (user_id, tracker_id, amount, entry_date, note, created_at)
             values ($1, $2, $3, $4, $5, coalesce($6::timestamptz, now()))`,
            [user.id, trackerId, e.amount, e.entryDate, note, createdAt],
          );
          entryCount++;
          const next = running + e.amount;
          for (const pct of crossedMilestones(running, next, target)) {
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

      // Set the completion flag INSIDE the transaction so a failure past this
      // point rolls back both the data and the flag. Idempotency of the whole
      // action rests on this single UPDATE succeeding atomically with the
      // inserts.
      await client.query(
        `update users
            set preferences = coalesce(preferences, '{}'::jsonb)
                           || jsonb_build_object('localMigrationCompletedAt', $2::text)
          where id = $1`,
        [user.id, new Date().toISOString()],
      );

      return { ok: true as const, trackers: trackerCount, entries: entryCount };
    });

    if (!result.ok) {
      return fail("already_migrated", "This device's local progress has already been imported.");
    }
    return { success: true, trackers: result.trackers, entries: result.entries };
  } catch (err) {
    // Full detail server-side (visible in Vercel function logs), sanitized
    // human copy to the client. No SQL / stack / secrets leak.
    console.error("importLocalDataAction: transaction failed", {
      message: (err as Error)?.message,
      code: (err as { code?: string })?.code,
      constraint: (err as { constraint?: string })?.constraint,
    });
    return fail(
      "internal",
      "We couldn't import your local progress. Nothing was changed — please try again.",
    );
  }
}
