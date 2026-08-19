// Backup payload shape.
//
// Extracted from `backup-actions.ts` so it can be imported by tests without
// pulling in the `"server-only"` module. The server action re-exports it so
// there is exactly one source of truth for the schema.
import { z } from "zod";

export const BACKUP_VERSION = 2;

export const backupPayloadSchema = z.object({
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.string(),
  trackers: z.array(
    z.object({
      externalId: z.string().optional(),
      name: z.string().min(1).max(120),
      arabicText: z.string().max(200).optional(),
      description: z.string().max(500).optional(),
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
      note: z.string().max(500).optional(),
      createdAt: z.string().optional(),
    }),
  ),
});

export type CloudBackupPayload = z.infer<typeof backupPayloadSchema>;
