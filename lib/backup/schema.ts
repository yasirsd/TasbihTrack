import { z } from "zod";

export const BACKUP_VERSION = 1;
export const BACKUP_APP = "tasbihtrack";

export const backupPreferencesSchema = z.object({
  theme: z.enum(["system", "light", "dark"]).optional(),
  onboardedAt: z.string().optional(),
});

export const backupUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  preferences: backupPreferencesSchema,
  passwordHash: z.string(),
  passwordSalt: z.string(),
  passwordIterations: z.number().int().positive(),
});

export const backupTrackerSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  arabicText: z.string().optional(),
  description: z.string().optional(),
  targetCount: z.number().int().nonnegative(),
  targetDate: z.string().optional(),
  status: z.enum(["active", "completed", "archived"]),
  sortOrder: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().optional(),
});

export const backupEntrySchema = z.object({
  id: z.string(),
  trackerId: z.string(),
  amount: z.number().int().positive(),
  entryDate: z.string(),
  note: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const backupSchema = z.object({
  app: z.literal(BACKUP_APP),
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.string(),
  user: backupUserSchema,
  trackers: z.array(backupTrackerSchema),
  entries: z.array(backupEntrySchema),
});

export type Backup = z.infer<typeof backupSchema>;
