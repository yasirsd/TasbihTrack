"use server";

import "server-only";
import { query, withTransaction } from "@/lib/server/db";
import { requireUser } from "@/lib/server/session";
import { z } from "zod";

const backupPayloadSchema = z.object({
  version: z.literal(2),
  exportedAt: z.string(),
  trackers: z.array(
    z.object({
      externalId: z.string().optional(),
      name: z.string().min(1),
      arabicText: z.string().optional(),
      description: z.string().optional(),
      targetCount: z.number().int().positive(),
      dailyTarget: z.number().int().positive().optional(),
      targetDate: z.string().optional(),
      status: z.enum(["active", "paused", "completed", "archived"]),
      isPinned: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
      startedAt: z.string().optional(),
      completedAt: z.string().optional(),
    }),
  ),
  entries: z.array(
    z.object({
      trackerExternalId: z.string(),
      amount: z.number().int().positive(),
      entryDate: z.string(),
      note: z.string().optional(),
      createdAt: z.string().optional(),
    }),
  ),
});

export type CloudBackupPayload = z.infer<typeof backupPayloadSchema>;

export async function exportBackupAction(): Promise<CloudBackupPayload & { user: { username: string } }> {
  const user = await requireUser();
  const trackers = await query<{
    id: string;
    name: string;
    arabic_text: string | null;
    description: string | null;
    target_count: number;
    daily_target: number | null;
    target_date: string | null;
    status: "active" | "paused" | "completed" | "archived";
    is_pinned: boolean;
    sort_order: number;
    started_at: string;
    completed_at: string | null;
  }>(
    `select id, name, arabic_text, description, target_count, daily_target, target_date, status, is_pinned, sort_order, started_at, completed_at
       from trackers where user_id = $1 and deleted_at is null`,
    [user.id],
  );
  const entries = await query<{
    tracker_id: string;
    amount: number;
    entry_date: string;
    note: string | null;
    created_at: string;
  }>(
    `select tracker_id, amount, entry_date::text as entry_date, note, created_at
       from progress_entries where user_id = $1 and deleted_at is null
       order by entry_date asc, created_at asc`,
    [user.id],
  );
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    user: { username: user.username },
    trackers: trackers.map((t) => ({
      externalId: t.id,
      name: t.name,
      arabicText: t.arabic_text ?? undefined,
      description: t.description ?? undefined,
      targetCount: Number(t.target_count),
      dailyTarget: t.daily_target !== null ? Number(t.daily_target) : undefined,
      targetDate: t.target_date ?? undefined,
      status: t.status,
      isPinned: t.is_pinned,
      sortOrder: t.sort_order,
      startedAt: t.started_at,
      completedAt: t.completed_at ?? undefined,
    })),
    entries: entries.map((e) => ({
      trackerExternalId: e.tracker_id,
      amount: Number(e.amount),
      entryDate: e.entry_date,
      note: e.note ?? undefined,
      createdAt: e.created_at,
    })),
  };
}

export async function importBackupAction(raw: unknown): Promise<{ trackers: number; entries: number }> {
  const user = await requireUser();
  const parsed = backupPayloadSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Invalid backup file.");
  const data = parsed.data;

  return withTransaction(async (client) => {
    // Replace this user's data for a clean restore.
    await client.query(`delete from trackers where user_id = $1`, [user.id]);
    const idMap = new Map<string, string>();
    for (const t of data.trackers) {
      const inserted = await client.query<{ id: string }>(
        `insert into trackers
           (user_id, name, arabic_text, description, target_count, daily_target, target_date,
            status, is_pinned, sort_order, started_at, completed_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,coalesce($11, now()),$12)
         returning id`,
        [
          user.id,
          t.name,
          t.arabicText ?? null,
          t.description ?? null,
          t.targetCount,
          t.dailyTarget ?? null,
          t.targetDate ?? null,
          t.status,
          t.isPinned ?? false,
          t.sortOrder ?? 0,
          t.startedAt ?? null,
          t.completedAt ?? null,
        ],
      );
      if (t.externalId) idMap.set(t.externalId, inserted.rows[0].id);
    }
    for (const e of data.entries) {
      const trackerId = idMap.get(e.trackerExternalId);
      if (!trackerId) continue;
      await client.query(
        `insert into progress_entries (user_id, tracker_id, amount, entry_date, note, created_at)
         values ($1, $2, $3, $4, $5, coalesce($6, now()))`,
        [user.id, trackerId, e.amount, e.entryDate, e.note ?? null, e.createdAt ?? null],
      );
    }
    return { trackers: data.trackers.length, entries: data.entries.length };
  });
}
