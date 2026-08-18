import "server-only";
import { Pool, types, type PoolClient } from "pg";
import { env } from "./env";
import { buildPgConfig } from "./pg-config.mjs";

// bigint columns → JS number (safe up to 2^53 = 9,007,199,254,740,992).
// Progress amounts and targets easily fit — we validate against 10^15 at the boundary.
types.setTypeParser(20, (v) => (v === null ? null : Number(v)));

declare global {
  // eslint-disable-next-line no-var
  var __tasbih_pg_pool: Pool | undefined;
}

function makePool(): Pool {
  return new Pool({
    ...buildPgConfig(env.postgresUrl),
    max: 5,
    idleTimeoutMillis: 30_000,
    keepAlive: true,
  });
}

export function getPool(): Pool {
  if (!globalThis.__tasbih_pg_pool) {
    globalThis.__tasbih_pg_pool = makePool();
  }
  return globalThis.__tasbih_pg_pool;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const pool = getPool();
  const res = await pool.query({ text, values: params as never[] });
  return res.rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    try {
      await client.query("rollback");
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    client.release();
  }
}

export const MAX_SAFE_AMOUNT = 1_000_000_000_000; // 1 trillion, generous cap
