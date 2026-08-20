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
import type {
  AvatarConfig,
  Gender,
  UserPreferences,
} from "@/lib/data/types";
import { defaultAvatarFor, sanitizeAvatarConfig } from "@/lib/avatar/config";
import {
  avatarForGenderTransition,
  isV3Config,
  sanitizeAvatarConfigV3ForGender,
} from "@/lib/avatar/config-v3";
import type { AvatarConfigV3 } from "@/lib/data/types";
import {
  profileUpdateSchema,
  registrationSchema,
  type AuthActionResult,
  type AuthPublicUser,
} from "./auth-schemas";

// ---------------------------------------------------------------------------
// Serializer
// ---------------------------------------------------------------------------

function toPublic(u: AuthenticatedUser): AuthPublicUser {
  return {
    id: u.id,
    username: u.username,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    preferences: (u.preferences ?? {}) as UserPreferences,
    profile: {
      firstName: u.firstName,
      lastName: u.lastName,
      gender: u.gender,
      avatar: sanitizeAvatarConfig(u.avatarConfig) as AvatarConfig | null,
    },
  };
}

// ---------------------------------------------------------------------------
// Register — extended payload; atomic user+profile insert; one session
// ---------------------------------------------------------------------------

export async function registerAction(
  raw: unknown,
  rememberMe: boolean = true,
): Promise<AuthActionResult> {
  const parsed = registrationSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_input",
      error: parsed.error.issues[0]?.message ?? "Please check the form.",
    };
  }
  const input = parsed.data;
  const normalized = input.username;
  const avatar = defaultAvatarFor(input.gender);

  try {
    const hash = await hashPassword(input.password);
    const row = await withTransaction(async (client) => {
      const existing = await client.query(
        `select id from users where username_normalized = $1 limit 1`,
        [normalized],
      );
      if (existing.rowCount) throw new UsernameTakenError();
      const insert = await client.query(
        `insert into users
           (username, username_normalized, password_hash, preferences,
            first_name, last_name, gender, avatar_config)
         values ($1, $1, $2, '{"theme":"system"}'::jsonb, $3, $4, $5, $6::jsonb)
         returning *`,
        [
          normalized,
          hash,
          input.firstName,
          input.lastName.length ? input.lastName : null,
          input.gender,
          JSON.stringify(avatar),
        ],
      );
      const user = insert.rows[0];
      await createSession(user.id, { rememberMe, client });
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
        profile: {
          firstName: row.first_name ?? null,
          lastName: row.last_name ?? null,
          gender: (row.gender ?? null) as Gender | null,
          avatar: sanitizeAvatarConfig(row.avatar_config),
        },
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

// ---------------------------------------------------------------------------
// Login — now takes rememberMe
// ---------------------------------------------------------------------------

export async function loginAction(
  username: string,
  password: string,
  rememberMe: boolean = true,
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
    first_name: string | null;
    last_name: string | null;
    gender: Gender | null;
    avatar_config: unknown;
    created_at: string;
    updated_at: string;
  }>(
    `select id, username, password_hash, preferences,
            first_name, last_name, gender, avatar_config,
            created_at, updated_at
       from users where username_normalized = $1 limit 1`,
    [normalized],
  );

  const ok = row ? await verifyPassword(p.data, row.password_hash) : false;
  await recordLoginAttempt(normalized, ok).catch(() => undefined);

  if (!ok || !row) {
    return { ok: false, code: "invalid_credentials", error: "Username or password is incorrect." };
  }
  await createSession(row.id, { rememberMe });
  return {
    ok: true,
    user: {
      id: row.id,
      username: row.username,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      preferences: row.preferences ?? {},
      profile: {
        firstName: row.first_name,
        lastName: row.last_name,
        gender: row.gender,
        avatar: sanitizeAvatarConfig(row.avatar_config),
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Simple wrappers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Profile update — server-side sanitization for avatar_config (§71, §73)
// ---------------------------------------------------------------------------

export async function updateProfileAction(raw: unknown): Promise<AuthActionResult> {
  try {
    const user = await requireUser();
    const parsed = profileUpdateSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        code: "invalid_input",
        error: parsed.error.issues[0]?.message ?? "Please check the form.",
      };
    }
    const input = parsed.data;
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (input.firstName !== undefined) {
      fields.push(`first_name = $${i++}`);
      values.push(input.firstName);
    }
    if (input.lastName !== undefined) {
      fields.push(`last_name = $${i++}`);
      values.push(input.lastName.length ? input.lastName : null);
    }

    // -----------------------------------------------------------------
    // Phase 6.2 avatar semantics (PROMPT 6.2 §Gender / §Server-side allowlist):
    //
    //  1. Determine the effective NEW gender for this update. Use the
    //     request value if supplied; otherwise the persisted value.
    //  2. Determine the effective NEW avatar:
    //       • If the client supplied a v3 payload that validates against
    //         the two-character curated allowlist AND matches the new
    //         gender, use it.
    //       • Else if the gender changed, run the transition helper
    //         (Karim → Kulthum / Kulthum → Karim, expression preserved
    //         when possible, or fall back to the new gender's default).
    //       • Else preserve the persisted avatar exactly — a stale
    //         client can never null out or downgrade a valid avatar.
    //     If the new gender is neutral, the persisted human avatar is
    //     cleared to null (renderer draws BrandMark).
    //  3. Write name + gender + avatar together in one UPDATE so
    //     nothing observes a mid-transition state.
    // -----------------------------------------------------------------

    const previousGender = user.gender;
    const newGender = input.gender !== undefined ? input.gender : previousGender;
    const previousAvatar = isV3Config(user.avatarConfig) ? user.avatarConfig : null;

    if (input.gender !== undefined) {
      fields.push(`gender = $${i++}`);
      values.push(input.gender);
    }

    let nextAvatar: AvatarConfigV3 | null | "preserve" = "preserve";

    if (input.avatarConfig !== undefined) {
      // Client-provided pick — must match the NEW gender.
      const scoped = sanitizeAvatarConfigV3ForGender(input.avatarConfig, newGender);
      if (scoped) nextAvatar = scoped;
      // Malformed / opposite-gender / legacy → keep whatever server logic
      // below decides (either preserve or gender-transition).
    }

    if (nextAvatar === "preserve" && input.gender !== undefined && input.gender !== previousGender) {
      // Gender changed and the client didn't supply a valid v3 for the
      // new gender. Server derives the new avatar deterministically.
      nextAvatar = avatarForGenderTransition(previousGender, newGender, previousAvatar);
    }

    if (nextAvatar !== "preserve") {
      fields.push(`avatar_config = $${i++}::jsonb`);
      values.push(nextAvatar ? JSON.stringify(nextAvatar) : null);
    }
    // else: preserve the persisted avatar exactly.
    if (fields.length === 0) {
      return { ok: true, user: toPublic(user) };
    }
    values.push(user.id);
    await query(
      `update users set ${fields.join(", ")} where id = $${i}`,
      values,
    );
    const refreshed = (await getCurrentUser())!;
    return { ok: true, user: toPublic(refreshed) };
  } catch (err) {
    console.error("updateProfileAction", err);
    return { ok: false, code: "internal", error: "Couldn't update profile." };
  }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

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
