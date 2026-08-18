"use client";
import { openDB, type IDBPDatabase } from "idb";
import type { ProgressEntry, Tracker } from "@/lib/data/types";

const DB_NAME = "tasbihtrack-cache";
const DB_VERSION = 2;

interface CacheDB {
  cache: {
    key: string;
    value: unknown;
  };
  write_queue: {
    key: string;
    value: PendingWrite;
    indexes: { by_user: string };
  };
}

export interface PendingWrite {
  id: string; // client-generated uuid; used as the pg row id when flushed
  userId: string;
  trackerId: string;
  amount: number;
  entryDate: string;
  note?: string;
  createdAt: string;
  attempts: number;
}

let dbPromise: Promise<IDBPDatabase<CacheDB>> | null = null;

function getDb(): Promise<IDBPDatabase<CacheDB>> {
  if (typeof window === "undefined") return Promise.reject(new Error("cache: window only"));
  if (!dbPromise) {
    dbPromise = openDB<CacheDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains("cache")) db.createObjectStore("cache");
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains("write_queue")) {
            const store = db.createObjectStore("write_queue", { keyPath: "id" });
            store.createIndex("by_user", "userId");
          }
        }
      },
    });
  }
  return dbPromise;
}

async function put<T>(key: string, value: T): Promise<void> {
  try {
    const db = await getDb();
    await db.put("cache", value as unknown as never, key);
  } catch {
    /* ignore */
  }
}

async function get<T>(key: string): Promise<T | undefined> {
  try {
    const db = await getDb();
    return (await db.get("cache", key)) as T | undefined;
  } catch {
    return undefined;
  }
}

export interface CachedSnapshot {
  userId: string;
  trackers: Tracker[];
  entries: ProgressEntry[];
  cachedAt: string;
}

export async function readSnapshot(userId: string): Promise<CachedSnapshot | null> {
  const value = (await get<CachedSnapshot>(`snapshot:${userId}`)) ?? null;
  if (!value || value.userId !== userId) return null;
  return value;
}

export async function writeSnapshot(snapshot: CachedSnapshot): Promise<void> {
  await put(`snapshot:${snapshot.userId}`, snapshot);
}

export async function clearSnapshot(userId: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete("cache", `snapshot:${userId}`);
  } catch {
    /* ignore */
  }
}

// =========================
// Write queue (offline)
// =========================

export async function enqueueWrite(entry: PendingWrite): Promise<void> {
  const db = await getDb();
  await db.put("write_queue", entry);
}

export async function updateQueueEntry(entry: PendingWrite): Promise<void> {
  const db = await getDb();
  await db.put("write_queue", entry);
}

export async function dequeueWrite(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("write_queue", id);
}

export async function listQueue(userId: string): Promise<PendingWrite[]> {
  const db = await getDb();
  const items = await db.getAllFromIndex("write_queue", "by_user", userId);
  return items.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

export async function clearQueueForUser(userId: string): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction("write_queue", "readwrite");
    const keys = await tx.store.index("by_user").getAllKeys(userId);
    for (const k of keys) await tx.store.delete(k);
    await tx.done;
  } catch {
    /* ignore */
  }
}

export async function clearAllCache(): Promise<void> {
  try {
    const db = await getDb();
    await db.clear("cache");
    await db.clear("write_queue");
  } catch {
    /* ignore */
  }
}
