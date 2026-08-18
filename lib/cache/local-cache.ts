"use client";
import { openDB, type IDBPDatabase } from "idb";
import type { ProgressEntry, Tracker } from "@/lib/data/types";

const DB_NAME = "tasbihtrack-cache";
const DB_VERSION = 1;

interface CacheDB {
  cache: {
    key: string;
    value: unknown;
  };
}

let dbPromise: Promise<IDBPDatabase<CacheDB>> | null = null;

function getDb(): Promise<IDBPDatabase<CacheDB>> {
  if (typeof window === "undefined") return Promise.reject(new Error("cache: window only"));
  if (!dbPromise) {
    dbPromise = openDB<CacheDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("cache")) db.createObjectStore("cache");
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
