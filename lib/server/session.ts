import "server-only";
import { cookies, headers } from "next/headers";
import crypto from "node:crypto";
import { query, queryOne, withTransaction } from "./db";
import { env } from "./env";
import type { PoolClient } from "pg";

const COOKIE_NAME = "tt_sid";
const SESSION_TTL_DAYS = 60;

interface DbSession {
  id: string;
  user_id: string;
  expires_at: string;
}

interface DbUser {
  id: string;
  username: string;
  username_normalized: string;
  password_hash: string;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  createdAt: string;
  updatedAt: string;
  preferences: Record<string, unknown>;
}

function hashToken(token: string): string {
  const secret = env.sessionSecret;
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

export async function createSession(userId: string, client?: PoolClient): Promise<string> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  const ua = (await headers()).get("user-agent")?.slice(0, 400) ?? null;

  const exec = client
    ? client.query.bind(client)
    : async (text: string, params: unknown[]) => {
        return { rows: await query(text, params) };
      };

  await exec(
    `insert into sessions (user_id, token_hash, user_agent, expires_at)
     values ($1, $2, $3, $4)`,
    [userId, tokenHash, ua, expires.toISOString()],
  );

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, cookieOptions(expires));
  return token;
}

export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (raw) {
    await query(`delete from sessions where token_hash = $1`, [hashToken(raw)]);
  }
  jar.delete(COOKIE_NAME);
}

export async function destroyAllOtherSessions(userId: string): Promise<void> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (raw) {
    await query(
      `delete from sessions where user_id = $1 and token_hash <> $2`,
      [userId, hashToken(raw)],
    );
  } else {
    await query(`delete from sessions where user_id = $1`, [userId]);
  }
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const row = await queryOne<DbSession & { user: DbUser }>(
    `select s.id, s.user_id, s.expires_at,
            u.id as u_id, u.username, u.username_normalized,
            u.preferences, u.created_at as u_created_at, u.updated_at as u_updated_at,
            u.password_hash
       from sessions s
       join users u on u.id = s.user_id
      where s.token_hash = $1
        and s.expires_at > now()
      limit 1`,
    [hashToken(raw)],
  );
  if (!row) {
    jar.delete(COOKIE_NAME);
    return null;
  }
  // Best-effort last_seen bump — non-blocking correctness.
  void query(`update sessions set last_seen_at = now() where token_hash = $1`, [
    hashToken(raw),
  ]).catch(() => undefined);

  const u = row as unknown as Record<string, unknown>;
  return {
    id: String(u.u_id),
    username: String(u.username),
    createdAt: String(u.u_created_at),
    updatedAt: String(u.u_updated_at),
    preferences: (u.preferences as Record<string, unknown>) ?? {},
  };
}

export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Not signed in.");
  return user;
}

export class AuthError extends Error {
  code = "unauthorized" as const;
}

// Convenience wrapper used by many mutations
export async function withUserTx<T>(
  fn: (client: PoolClient, user: AuthenticatedUser) => Promise<T>,
): Promise<T> {
  const user = await requireUser();
  return withTransaction((client) => fn(client, user));
}
