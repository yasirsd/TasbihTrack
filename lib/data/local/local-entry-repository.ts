import { generateId, getDb } from "./indexed-db";
import type { EntryRepository } from "@/lib/data/repositories/types";
import type { CreateEntryInput, ProgressEntry, UpdateEntryInput } from "@/lib/data/types";
import { toLocalDateKey } from "@/lib/date-utils";

export class LocalEntryRepository implements EntryRepository {
  async create(userId: string, input: CreateEntryInput): Promise<ProgressEntry> {
    const db = await getDb();
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new Error("Amount must be greater than zero");
    }
    const tracker = await db.get("trackers", input.trackerId);
    if (!tracker || tracker.userId !== userId) throw new Error("Tracker not found");
    const now = new Date().toISOString();
    const entry: ProgressEntry = {
      id: generateId(),
      userId,
      trackerId: input.trackerId,
      amount: Math.floor(input.amount),
      entryDate: input.entryDate || toLocalDateKey(new Date()),
      note: input.note?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
    await db.add("entries", entry);
    return entry;
  }

  async update(userId: string, id: string, patch: UpdateEntryInput): Promise<ProgressEntry> {
    const db = await getDb();
    const existing = await db.get("entries", id);
    if (!existing || existing.userId !== userId) throw new Error("Entry not found");
    if (patch.amount !== undefined && (!Number.isFinite(patch.amount) || patch.amount <= 0)) {
      throw new Error("Amount must be greater than zero");
    }
    const next: ProgressEntry = {
      ...existing,
      amount: patch.amount !== undefined ? Math.floor(patch.amount) : existing.amount,
      entryDate: patch.entryDate ?? existing.entryDate,
      note:
        patch.note !== undefined ? (patch.note?.trim() || undefined) : existing.note,
      updatedAt: new Date().toISOString(),
    };
    await db.put("entries", next);
    return next;
  }

  async delete(userId: string, id: string): Promise<void> {
    const db = await getDb();
    const existing = await db.get("entries", id);
    if (!existing || existing.userId !== userId) return;
    await db.delete("entries", id);
  }

  async get(userId: string, id: string): Promise<ProgressEntry | null> {
    const db = await getDb();
    const e = await db.get("entries", id);
    if (!e || e.userId !== userId) return null;
    return e;
  }

  async listForUser(userId: string): Promise<ProgressEntry[]> {
    const db = await getDb();
    const items = await db.getAllFromIndex("entries", "by_user", userId);
    return items.sort(sortByEntryDateDesc);
  }

  async listForTracker(userId: string, trackerId: string): Promise<ProgressEntry[]> {
    const db = await getDb();
    const items = await db.getAllFromIndex("entries", "by_user_tracker", [userId, trackerId]);
    return items.sort(sortByEntryDateDesc);
  }

  async deleteAllForTracker(userId: string, trackerId: string): Promise<void> {
    const db = await getDb();
    const tx = db.transaction("entries", "readwrite");
    const keys = await tx.store.index("by_user_tracker").getAllKeys([userId, trackerId]);
    for (const key of keys) await tx.store.delete(key);
    await tx.done;
  }

  async deleteAllForUser(userId: string): Promise<void> {
    const db = await getDb();
    const tx = db.transaction("entries", "readwrite");
    const keys = await tx.store.index("by_user").getAllKeys(userId);
    for (const key of keys) await tx.store.delete(key);
    await tx.done;
  }
}

function sortByEntryDateDesc(a: ProgressEntry, b: ProgressEntry): number {
  if (a.entryDate !== b.entryDate) return a.entryDate < b.entryDate ? 1 : -1;
  return a.createdAt < b.createdAt ? 1 : -1;
}
