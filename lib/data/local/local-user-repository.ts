import { getDb } from "./indexed-db";
import type { UserRepository } from "@/lib/data/repositories/types";
import type { PublicUser, StoredUser, UserPreferences } from "@/lib/data/types";

export class LocalUserRepository implements UserRepository {
  async create(user: Omit<StoredUser, "createdAt" | "updatedAt"> & { createdAt?: string }): Promise<StoredUser> {
    const db = await getDb();
    const now = new Date().toISOString();
    const record: StoredUser = {
      ...user,
      createdAt: user.createdAt ?? now,
      updatedAt: now,
    };
    await db.add("users", record);
    return record;
  }

  async findByUsername(usernameLower: string): Promise<StoredUser | null> {
    const db = await getDb();
    const value = await db.getFromIndex("users", "by_username_lower", usernameLower);
    return value ?? null;
  }

  async findById(id: string): Promise<StoredUser | null> {
    const db = await getDb();
    return (await db.get("users", id)) ?? null;
  }

  async list(): Promise<StoredUser[]> {
    const db = await getDb();
    return await db.getAll("users");
  }

  async update(id: string, patch: Partial<StoredUser>): Promise<StoredUser> {
    const db = await getDb();
    const existing = await db.get("users", id);
    if (!existing) throw new Error("User not found");
    const next: StoredUser = {
      ...existing,
      ...patch,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    };
    await db.put("users", next);
    return next;
  }

  async updatePreferences(id: string, prefs: Partial<UserPreferences>): Promise<StoredUser> {
    const existing = await this.findById(id);
    if (!existing) throw new Error("User not found");
    return this.update(id, {
      preferences: { ...existing.preferences, ...prefs },
    });
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(["users", "trackers", "entries"], "readwrite");
    await tx.objectStore("users").delete(id);
    const trackers = await tx.objectStore("trackers").index("by_user").getAllKeys(id);
    for (const key of trackers) await tx.objectStore("trackers").delete(key);
    const entries = await tx.objectStore("entries").index("by_user").getAllKeys(id);
    for (const key of entries) await tx.objectStore("entries").delete(key);
    await tx.done;
  }

  toPublic(user: StoredUser): PublicUser {
    return {
      id: user.id,
      username: user.username,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      preferences: user.preferences,
    };
  }
}
