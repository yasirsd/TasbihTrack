import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { ProgressEntry, StoredUser, Tracker } from "@/lib/data/types";

export const DB_NAME = "tasbihtrack";
export const DB_VERSION = 1;

export interface TasbihDB extends DBSchema {
  users: {
    key: string;
    value: StoredUser;
    indexes: { by_username_lower: string };
  };
  trackers: {
    key: string;
    value: Tracker;
    indexes: { by_user: string };
  };
  entries: {
    key: string;
    value: ProgressEntry;
    indexes: {
      by_user: string;
      by_tracker: string;
      by_user_tracker: [string, string];
    };
  };
  meta: {
    key: string;
    value: unknown;
  };
}

let dbPromise: Promise<IDBPDatabase<TasbihDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<TasbihDB>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB is only available in the browser"));
  }
  if (!dbPromise) {
    dbPromise = openDB<TasbihDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("users")) {
          const users = db.createObjectStore("users", { keyPath: "id" });
          users.createIndex("by_username_lower", "usernameLower", { unique: true });
        }
        if (!db.objectStoreNames.contains("trackers")) {
          const trackers = db.createObjectStore("trackers", { keyPath: "id" });
          trackers.createIndex("by_user", "userId");
        }
        if (!db.objectStoreNames.contains("entries")) {
          const entries = db.createObjectStore("entries", { keyPath: "id" });
          entries.createIndex("by_user", "userId");
          entries.createIndex("by_tracker", "trackerId");
          entries.createIndex("by_user_tracker", ["userId", "trackerId"]);
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta");
        }
      },
    });
  }
  return dbPromise;
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  return (await db.get("meta", key)) as T | undefined;
}

export async function setMeta<T>(key: string, value: T): Promise<void> {
  const db = await getDb();
  await db.put("meta", value as unknown as never, key);
}

export async function deleteMeta(key: string): Promise<void> {
  const db = await getDb();
  await db.delete("meta", key);
}

export function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
