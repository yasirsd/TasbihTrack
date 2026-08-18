import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username needs at least 3 characters.")
  .max(20, "Username must be 20 characters or fewer.")
  .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscore only.");

export const passwordSchema = z
  .string()
  .min(6, "Password needs at least 6 characters.")
  .max(128, "Password is too long.");

export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date.");

export const positiveIntSchema = z
  .number({ invalid_type_error: "Must be a number." })
  .int()
  .positive()
  .max(1_000_000_000_000, "That number is too large.");

export const createTrackerSchema = z.object({
  name: z.string().trim().min(1, "Please give this goal a name.").max(120),
  arabicText: z.string().trim().max(300).optional(),
  description: z.string().trim().max(600).optional(),
  targetCount: positiveIntSchema,
  dailyTarget: positiveIntSchema.optional(),
  targetDate: dateKeySchema.optional(),
  startingProgress: positiveIntSchema.optional(),
});

export const updateTrackerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(120).optional(),
  arabicText: z.string().trim().max(300).nullable().optional(),
  description: z.string().trim().max(600).nullable().optional(),
  targetCount: positiveIntSchema.optional(),
  dailyTarget: positiveIntSchema.nullable().optional(),
  targetDate: dateKeySchema.nullable().optional(),
  status: z.enum(["active", "paused", "completed", "archived"]).optional(),
  isPinned: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const createEntrySchema = z.object({
  trackerId: z.string().uuid(),
  amount: positiveIntSchema,
  entryDate: dateKeySchema.optional(),
  note: z.string().trim().max(500).optional(),
});

export const updateEntrySchema = z.object({
  id: z.string().uuid(),
  amount: positiveIntSchema.optional(),
  entryDate: dateKeySchema.optional(),
  note: z.string().trim().max(500).nullable().optional(),
});
