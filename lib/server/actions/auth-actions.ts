"use server";

import "server-only";
import { query, queryOne, withTransaction } from "@/lib/server/db";
import { hashPassword, verifyPassword } from "@/lib/server/password";
import { recordLoginAttempt, tooManyRecentFailures } from "@/lib/server/rate-limit";
import {
  createSession,
  destroyAllOtherSessions,
  destroyCurrentSession,
  getCurrentUser,
  requireUser,
  type AuthenticatedUser,
} from "@/lib/server/session";
import { passwordSchema, usernameSchema } from "@/lib/validation";
import type { UserPreferences } from "@/lib/data/types";

export interface AuthActionResult {
  ok: boolean;
  user?: {
    id: string;
    username: string;
    createdAt: string;
    updatedAt: string;
    preferences: UserPreferences;
  };
  error?: string;
  code?:
    | "invalid_input"
    | "username_taken"
    | "invalid_credentials"
    | "rate_limited"
    | "unauthorized"
    | "internal";
}

function toPublic(u: AuthenticatedUser) {
  return {
    id: u.id,
    username: u.username,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    preferences: (u.preferences ?? {}) as UserPreferences,
  };
}

export async function registerAction(
  username: string,
  password: string,
): Promise<AuthActionResult> {
  const u = usernameSchema.safeParse(username);
  if (!u.success) return { ok: false, code: "invalid_input", error: u.error.issues[0]?.message };
  const p = passwordSchema.safeParse(password);
  if (!p.success) return { ok: false, code: "invalid_input", error: p.error.issues[0]?.message };
  const normalized = u.data;

  try {
    const hash = await hashPassword(p.data);
    const row = await withTransaction(async (client) => {
      const existing = await client.query(
        `select id from users where username_normalized = $1 limit 1`,
        [normalized],
      );
      if (existing.rowCount) {
        throw new UsernameTakenError();
      }
      const insert = await client.query(
        `insert into users (username, username_normalized, password_hash, preferences)
         values ($1, $1, $2, '{"theme":"system"}'::jsonb)
         returning id, username, username_normalized, preferences, created_at, updated_at`,
        [normalized, hash],
      );
      const user = insert.rows[0];
      await createSession(user.id, client);
      return user;
    });
    return {
      ok: true,
      user: {
        id: row.id,
        username: row.username,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
        preferences: (row.preferences ?? {}) as UserPreferences,
      },
    };
  } catch (err) {
    if (err instanceof UsernameTakenError) {
      return { ok: false, code: "username_taken", error: "That username is already taken." };
    }
    console.error("registerAction failed", err);
    return { ok: false, code: "internal", error: "Something went wrong. Please try again." };
  }
}

export async function loginAction(
  username: string,
  password: string,
): Promise<AuthActionResult> {
  const u = usernameSchema.safeParse(username);
  if (!u.success)
    return { ok: false, code: "invalid_credentials", error: "Username or password is incorrect." };
  const p = passwordSchema.safeParse(password);
  if (!p.success)
    return { ok: false, code: "invalid_credentials", error: "Username or password is incorrect." };

  const normalized = u.data;
  if (await tooManyRecentFailures(normalized)) {
    return {
      ok: false,
      code: "rate_limited",
      error: "Too many recent attempts. Please wait a few minutes and try again.",
    };
  }

  const row = await queryOne<{
    id: string;
    username: string;
    password_hash: string;
    preferences: UserPreferences;
    created_at: string;
    updated_at: string;
  }>(
    `select id, username, password_hash, preferences, created_at, updated_at
       from users where username_normalized = $1 limit 1`,
    [normalized],
  );

  const ok = row ? await verifyPassword(p.data, row.password_hash) : false;
  await recordLoginAttempt(normalized, ok).catch(() => undefined);

  if (!ok || !row) {
    return { ok: false, code: "invalid_credentials", error: "Username or password is incorrect." };
  }
  await createSession(row.id);
  return {
    ok: true,
    user: {
      id: row.id,
      username: row.username,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      preferences: row.preferences ?? {},
    },
  };
}

export async function logoutAction(): Promise<{ ok: true }> {
  await destroyCurrentSession();
  return { ok: true };
}

export async function currentUserAction(): Promise<AuthActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "unauthorized" };
  return { ok: true, user: toPublic(user) };
}

export async function changePasswordAction(
  current: string,
  next: string,
): Promise<AuthActionResult> {
  try {
    const user = await requireUser();
    const p = passwordSchema.safeParse(next);
    if (!p.success)
      return { ok: false, code: "invalid_input", error: p.error.issues[0]?.message };
    const row = await queryOne<{ password_hash: string }>(
      `select password_hash from users where id = $1 limit 1`,
      [user.id],
    );
    if (!row) return { ok: false, code: "unauthorized" };
    if (!(await verifyPassword(current, row.password_hash))) {
      return { ok: false, code: "invalid_credentials", error: "Current password is incorrect." };
    }
    const hash = await hashPassword(p.data);
    await query(`update users set password_hash = $1 where id = $2`, [hash, user.id]);
    await destroyAllOtherSessions(user.id);
    const refreshed = (await getCurrentUser())!;
    return { ok: true, user: toPublic(refreshed) };
  } catch (err) {
    console.error("changePasswordAction", err);
    return { ok: false, code: "internal", error: "Couldn't change password." };
  }
}

export async function updatePreferencesAction(
  patch: Partial<UserPreferences>,
): Promise<AuthActionResult> {
  try {
    const user = await requireUser();
    const merged = { ...(user.preferences as UserPreferences), ...patch };
    await query(
      `update users set preferences = $1::jsonb where id = $2`,
      [JSON.stringify(merged), user.id],
    );
    const refreshed = (await getCurrentUser())!;
    return { ok: true, user: toPublic(refreshed) };
  } catch (err) {
    console.error("updatePreferencesAction", err);
    return { ok: false, code: "internal", error: "Couldn't update preferences." };
  }
}

export async function deleteAccountAction(password: string): Promise<AuthActionResult> {
  try {
    const user = await requireUser();
    const row = await queryOne<{ password_hash: string }>(
      `select password_hash from users where id = $1 limit 1`,
      [user.id],
    );
    if (!row) return { ok: false, code: "unauthorized" };
    if (!(await verifyPassword(password, row.password_hash))) {
      return { ok: false, code: "invalid_credentials", error: "Password is incorrect." };
    }
    await query(`delete from users where id = $1`, [user.id]);
    await destroyCurrentSession();
    return { ok: true };
  } catch (err) {
    console.error("deleteAccountAction", err);
    return { ok: false, code: "internal", error: "Couldn't delete account." };
  }
}

class UsernameTakenError extends Error {}
