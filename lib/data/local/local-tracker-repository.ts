import { generateId, getDb } from "./indexed-db";
import type { TrackerRepository } from "@/lib/data/repositories/types";
import type { CreateTrackerInput, Tracker, UpdateTrackerInput } from "@/lib/data/types";

export class LocalTrackerRepository implements TrackerRepository {
  async create(userId: string, input: CreateTrackerInput): Promise<Tracker> {
    const db = await getDb();
    const now = new Date().toISOString();
    const all = await db.getAllFromIndex("trackers", "by_user", userId);
    const sortOrder =
      all.reduce((max, t) => Math.max(max, t.sortOrder ?? 0), -1) + 1;
    const tracker: Tracker = {
      id: generateId(),
      userId,
      name: input.name.trim(),
      arabicText: input.arabicText?.trim() || undefined,
      description: input.description?.trim() || undefined,
      targetCount: Math.floor(input.targetCount),
      targetDate: input.targetDate || undefined,
      status: "active",
      sortOrder,
      createdAt: now,
      updatedAt: now,
    };
    await db.add("trackers", tracker);
    return tracker;
  }

  async update(userId: string, id: string, patch: UpdateTrackerInput): Promise<Tracker> {
    const db = await getDb();
    const existing = await db.get("trackers", id);
    if (!existing || existing.userId !== userId) throw new Error("Tracker not found");
    const next: Tracker = {
      ...existing,
      name: patch.name !== undefined ? patch.name.trim() : existing.name,
      arabicText:
        patch.arabicText !== undefined
          ? patch.arabicText?.trim() || undefined
          : existing.arabicText,
      description:
        patch.description !== undefined
          ? patch.description?.trim() || undefined
          : existing.description,
      targetCount:
        patch.targetCount !== undefined
          ? Math.floor(patch.targetCount)
          : existing.targetCount,
      targetDate:
        patch.targetDate !== undefined
          ? (patch.targetDate || undefined)
          : existing.targetDate,
      status: patch.status ?? existing.status,
      sortOrder: patch.sortOrder ?? existing.sortOrder,
      updatedAt: new Date().toISOString(),
      completedAt:
        patch.status === "completed" && !existing.completedAt
          ? new Date().toISOString()
          : patch.status === "active"
            ? undefined
            : existing.completedAt,
    };
    await db.put("trackers", next);
    return next;
  }

  async delete(userId: string, id: string): Promise<void> {
    const db = await getDb();
    const existing = await db.get("trackers", id);
    if (!existing || existing.userId !== userId) return;
    const tx = db.transaction(["trackers", "entries"], "readwrite");
    await tx.objectStore("trackers").delete(id);
    const entryKeys = await tx.objectStore("entries").index("by_tracker").getAllKeys(id);
    for (const key of entryKeys) await tx.objectStore("entries").delete(key);
    await tx.done;
  }

  async get(userId: string, id: string): Promise<Tracker | null> {
    const db = await getDb();
    const t = await db.get("trackers", id);
    if (!t || t.userId !== userId) return null;
    return t;
  }

  async listForUser(userId: string): Promise<Tracker[]> {
    const db = await getDb();
    const list = await db.getAllFromIndex("trackers", "by_user", userId);
    return list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }
}
