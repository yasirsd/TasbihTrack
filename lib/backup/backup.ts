import { getRepositories } from "@/lib/data/repositories";
import { generateId, getDb } from "@/lib/data/local/indexed-db";
import type { StoredUser } from "@/lib/data/types";
import {
  BACKUP_APP,
  BACKUP_VERSION,
  backupSchema,
  type Backup,
} from "./schema";

export async function exportBackup(userId: string): Promise<Backup> {
  const { users, trackers, entries } = getRepositories();
  const stored = await users.findById(userId);
  if (!stored) throw new Error("Account not found");
  const trackerList = await trackers.listForUser(userId);
  const entryList = await entries.listForUser(userId);
  const backup: Backup = {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    user: {
      id: stored.id,
      username: stored.username,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
      preferences: stored.preferences,
      passwordHash: stored.passwordHash,
      passwordSalt: stored.passwordSalt,
      passwordIterations: stored.passwordIterations,
    },
    trackers: trackerList.map((t) => ({
      id: t.id,
      name: t.name,
      arabicText: t.arabicText,
      description: t.description,
      targetCount: t.targetCount,
      targetDate: t.targetDate,
      status: t.status,
      sortOrder: t.sortOrder,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      completedAt: t.completedAt,
    })),
    entries: entryList.map((e) => ({
      id: e.id,
      trackerId: e.trackerId,
      amount: e.amount,
      entryDate: e.entryDate,
      note: e.note,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    })),
  };
  return backup;
}

export function parseBackup(raw: unknown): { ok: true; backup: Backup } | { ok: false; message: string } {
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "This file is not a valid TasbihTrack backup." };
  }
  return { ok: true, backup: parsed.data };
}

export async function summarizeBackup(backup: Backup) {
  return {
    username: backup.user.username,
    trackerCount: backup.trackers.length,
    entryCount: backup.entries.length,
    exportedAt: backup.exportedAt,
  };
}

export interface RestoreOptions {
  targetUserId: string; // restore into the currently signed-in user
}

export async function restoreBackup(backup: Backup, opts: RestoreOptions): Promise<{ trackers: number; entries: number }> {
  const db = await getDb();
  const { users } = getRepositories();
  const currentUser = await users.findById(opts.targetUserId);
  if (!currentUser) throw new Error("Target account not found");

  const trackerIdMap = new Map<string, string>();
  const now = new Date().toISOString();

  const tx = db.transaction(["trackers", "entries"], "readwrite");
  // wipe existing data for this user
  const existingTrackers = await tx.objectStore("trackers").index("by_user").getAllKeys(opts.targetUserId);
  for (const k of existingTrackers) await tx.objectStore("trackers").delete(k);
  const existingEntries = await tx.objectStore("entries").index("by_user").getAllKeys(opts.targetUserId);
  for (const k of existingEntries) await tx.objectStore("entries").delete(k);

  for (const t of backup.trackers) {
    const newId = generateId();
    trackerIdMap.set(t.id, newId);
    await tx.objectStore("trackers").add({
      id: newId,
      userId: opts.targetUserId,
      name: t.name,
      arabicText: t.arabicText,
      description: t.description,
      targetCount: t.targetCount,
      targetDate: t.targetDate,
      status: t.status,
      sortOrder: t.sortOrder,
      createdAt: t.createdAt ?? now,
      updatedAt: now,
      completedAt: t.completedAt,
    });
  }
  for (const e of backup.entries) {
    const mappedTrackerId = trackerIdMap.get(e.trackerId);
    if (!mappedTrackerId) continue; // skip entries whose tracker missing
    await tx.objectStore("entries").add({
      id: generateId(),
      userId: opts.targetUserId,
      trackerId: mappedTrackerId,
      amount: e.amount,
      entryDate: e.entryDate,
      note: e.note,
      createdAt: e.createdAt ?? now,
      updatedAt: now,
    });
  }
  await tx.done;
  return { trackers: backup.trackers.length, entries: backup.entries.length };
}

export function backupFilename(username: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const safe = username.replace(/[^a-z0-9_]/gi, "_").toLowerCase();
  return `tasbihtrack-${safe}-${y}-${m}-${d}.json`;
}

export function downloadJson(name: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
