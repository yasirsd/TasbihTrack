import "server-only";
import { query } from "./db";

const WINDOW_MINUTES = 15;
const MAX_ATTEMPTS = 8;

export async function tooManyRecentFailures(usernameNormalized: string): Promise<boolean> {
  const rows = await query<{ count: string }>(
    `select count(*)::text as count
       from login_attempts
      where username_normalized = $1
        and success = false
        and attempted_at > now() - ($2 || ' minutes')::interval`,
    [usernameNormalized, String(WINDOW_MINUTES)],
  );
  const count = Number(rows[0]?.count ?? 0);
  return count >= MAX_ATTEMPTS;
}

export async function recordLoginAttempt(
  usernameNormalized: string,
  success: boolean,
): Promise<void> {
  await query(
    `insert into login_attempts (username_normalized, success) values ($1, $2)`,
    [usernameNormalized, success],
  );
  // Best-effort cleanup of old rows.
  void query(
    `delete from login_attempts where attempted_at < now() - interval '2 days'`,
  ).catch(() => undefined);
}
