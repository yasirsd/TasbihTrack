"use client";
import { openDB } from "idb";
import type { LocalMigrationPayload } from "@/lib/server/actions/migration-actions";

const OLD_DB = "tasbihtrack";
const OLD_VERSION = 1;

interface OldUser {
  id: string;
  usernameLower: string;
}
interface OldTracker {
  id: string;
  userId: string;
  name: string;
  arabicText?: string | null;
  description?: string | null;
  targetCount: number;
  targetDate?: string | null;
  status?: string | null;
  sortOrder?: number | null;
  createdAt: string;
  completedAt?: string | null;
}
interface OldEntry {
  id: string;
  userId: string;
  trackerId: string;
  amount: number;
  entryDate: string;
  note?: string | null;
  createdAt: string;
}

export interface LocalDataSummary {
  usernameNormalized: string;
  trackerCount: number;
  entryCount: number;
  payload: LocalMigrationPayload;
}

// In-memory session cache so we scan IndexedDB once per authenticated session
// even if the caller renders us many times.
const detectionCache = new Map<string, LocalDataSummary | null>();

export function invalidateDetectionCache(usernameNormalized?: string): void {
  if (usernameNormalized) detectionCache.delete(usernameNormalized);
  else detectionCache.clear();
}

/**
 * Strips undefined values and returns a plain-object payload that is safe to
 * send over Server Actions. Undefined properties on the wire are inconsistent
 * across React/Next versions — we normalize to explicit nulls for all optional
 * strings, which the server schema accepts (`.nullish()`).
 */
function sanitizePayload(payload: LocalMigrationPayload): LocalMigrationPayload {
  return {
    usernameNormalized: String(payload.usernameNormalized ?? ""),
    trackers: payload.trackers.map((t) => ({
      externalId: t.externalId,
      name: t.name,
      arabicText: t.arabicText ?? null,
      description: t.description ?? null,
      targetCount: t.targetCount,
      targetDate: t.targetDate ?? null,
      status: t.status ?? null,
      sortOrder: typeof t.sortOrder === "number" ? t.sortOrder : null,
      startedAt: t.startedAt ?? null,
      completedAt: t.completedAt ?? null,
    })),
    entries: payload.entries.map((e) => ({
      trackerExternalId: e.trackerExternalId,
      amount: e.amount,
      entryDate: e.entryDate,
      note: e.note ?? null,
      createdAt: e.createdAt ?? null,
    })),
  };
}

export async function detectPhase1Data(
  usernameNormalized: string,
): Promise<LocalDataSummary | null> {
  if (typeof window === "undefined") return null;
  if (detectionCache.has(usernameNormalized)) {
    return detectionCache.get(usernameNormalized) ?? null;
  }
  try {
    const exists = await databaseExists(OLD_DB);
    if (!exists) {
      detectionCache.set(usernameNormalized, null);
      return null;
    }
    const db = await openDB(OLD_DB, OLD_VERSION);
    if (!db.objectStoreNames.contains("users") || !db.objectStoreNames.contains("trackers")) {
      db.close();
      detectionCache.set(usernameNormalized, null);
      return null;
    }
    const users = (await db.getAll("users")) as OldUser[];
    const match = users.find((u) => u.usernameLower === usernameNormalized);
    if (!match) {
      db.close();
      detectionCache.set(usernameNormalized, null);
      return null;
    }
    const trackers = ((await db.getAll("trackers")) as OldTracker[]).filter(
      (t) => t.userId === match.id,
    );
    const entries = ((await db.getAll("entries")) as OldEntry[]).filter(
      (e) => e.userId === match.id,
    );
    db.close();
    if (trackers.length === 0 && entries.length === 0) {
      detectionCache.set(usernameNormalized, null);
      return null;
    }

    const summary: LocalDataSummary = {
      usernameNormalized,
      trackerCount: trackers.length,
      entryCount: entries.length,
      payload: sanitizePayload({
        usernameNormalized,
        trackers: trackers.map((t) => ({
          externalId: t.id,
          name: t.name,
          arabicText: t.arabicText ?? null,
          description: t.description ?? null,
          targetCount: t.targetCount,
          targetDate: t.targetDate ?? null,
          status: t.status ?? null,
          sortOrder: typeof t.sortOrder === "number" ? t.sortOrder : null,
          startedAt: t.createdAt,
          completedAt: t.completedAt ?? null,
        })),
        entries: entries.map((e) => ({
          trackerExternalId: e.trackerId,
          amount: e.amount,
          entryDate: e.entryDate,
          note: e.note ?? null,
          createdAt: e.createdAt,
        })),
      }),
    };
    detectionCache.set(usernameNormalized, summary);
    return summary;
  } catch {
    detectionCache.set(usernameNormalized, null);
    return null;
  }
}

async function databaseExists(name: string): Promise<boolean> {
  try {
    const idb = indexedDB as unknown as { databases?: () => Promise<{ name?: string }[]> };
    if (typeof idb.databases === "function") {
      const list = await idb.databases();
      return list.some((d) => d.name === name);
    }
  } catch {
    /* ignore */
  }
  return true; // best effort — open() call gates the rest
}

export const __test__ = { sanitizePayload };
