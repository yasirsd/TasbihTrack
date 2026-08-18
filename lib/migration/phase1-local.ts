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
  arabicText?: string;
  description?: string;
  targetCount: number;
  targetDate?: string;
  status: "active" | "completed" | "archived";
  sortOrder: number;
  createdAt: string;
  completedAt?: string;
}
interface OldEntry {
  id: string;
  userId: string;
  trackerId: string;
  amount: number;
  entryDate: string;
  note?: string;
  createdAt: string;
}

export interface LocalDataSummary {
  usernameNormalized: string;
  trackerCount: number;
  entryCount: number;
  payload: LocalMigrationPayload;
}

export async function detectPhase1Data(usernameNormalized: string): Promise<LocalDataSummary | null> {
  if (typeof window === "undefined") return null;
  try {
    const exists = await databaseExists(OLD_DB);
    if (!exists) return null;
    const db = await openDB(OLD_DB, OLD_VERSION);
    if (!db.objectStoreNames.contains("users") || !db.objectStoreNames.contains("trackers")) {
      db.close();
      return null;
    }
    const users = (await db.getAll("users")) as OldUser[];
    const match = users.find((u) => u.usernameLower === usernameNormalized);
    if (!match) {
      db.close();
      return null;
    }
    const trackers = ((await db.getAll("trackers")) as OldTracker[]).filter(
      (t) => t.userId === match.id,
    );
    const entries = ((await db.getAll("entries")) as OldEntry[]).filter(
      (e) => e.userId === match.id,
    );
    db.close();
    if (trackers.length === 0 && entries.length === 0) return null;

    return {
      usernameNormalized,
      trackerCount: trackers.length,
      entryCount: entries.length,
      payload: {
        usernameNormalized,
        trackers: trackers.map((t) => ({
          externalId: t.id,
          name: t.name,
          arabicText: t.arabicText,
          description: t.description,
          targetCount: t.targetCount,
          targetDate: t.targetDate,
          status: t.status,
          sortOrder: t.sortOrder,
          startedAt: t.createdAt,
          completedAt: t.completedAt,
        })),
        entries: entries.map((e) => ({
          trackerExternalId: e.trackerId,
          amount: e.amount,
          entryDate: e.entryDate,
          note: e.note,
          createdAt: e.createdAt,
        })),
      },
    };
  } catch {
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
