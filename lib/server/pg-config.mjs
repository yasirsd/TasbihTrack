// Shared Postgres/TLS configuration used by both the app's runtime pool
// (lib/server/db.ts) and the standalone connection test (scripts/test-db.mjs).
// Pure ESM JavaScript so both TS and plain node imports work without a build.
//
// SECURITY: we never disable certificate verification. If the CA cannot be
// loaded we throw — the caller must fail closed rather than downgrade.
//
// Kept as .mjs (no "server-only" guard) so the standalone script can import
// it too. Because it imports node:fs, Next.js will refuse to bundle it into
// client code, which is the practical safeguard.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Reads the Supabase CA from `SUPABASE_CA_CERT` (raw PEM or base64) if set,
 * otherwise from `certs/supabase-ca.crt` in the repo. Throws with a clear
 * message if neither is available.
 *
 * @returns {string} PEM-encoded certificate
 */
export function loadSupabaseCa() {
  const inline = process.env.SUPABASE_CA_CERT;
  if (inline && inline.trim().length > 0) {
    const trimmed = inline.trim();
    if (trimmed.startsWith("-----BEGIN")) return trimmed;
    try {
      const decoded = Buffer.from(trimmed, "base64").toString("utf8");
      if (decoded.startsWith("-----BEGIN")) return decoded;
    } catch {
      /* fall through */
    }
    throw new Error("SUPABASE_CA_CERT is set but does not contain a valid PEM certificate.");
  }
  const filePath = path.join(process.cwd(), "certs", "supabase-ca.crt");
  if (!existsSync(filePath)) {
    throw new Error(
      "Supabase CA certificate not found. Either place the PEM at " +
        "certs/supabase-ca.crt or set SUPABASE_CA_CERT. See PHASE2.md.",
    );
  }
  return readFileSync(filePath, "utf8");
}

// These are the libpq-style query params that node-postgres's
// pg-connection-string parses into an `ssl` config. If present in the URL,
// pg's parsed ssl config is Object.assign'd over the explicit ssl option we
// pass to Pool/Client, silently discarding our `ca`. We strip them so the
// programmatic { ca } config is the sole source of TLS truth.
const SSL_URL_PARAMS = Object.freeze([
  "sslmode",
  "sslcert",
  "sslkey",
  "sslrootcert",
  "sslcrl",
  "sslpassword",
  "sslnegotiation",
  "ssl",
]);

/**
 * Returns the connection string with any TLS-related query parameters removed.
 * All unrelated Supabase/pooler parameters (e.g. `pgbouncer`, `supa=...`) are
 * preserved unchanged.
 *
 * @param {string} url raw connection string
 * @returns {string} sanitized connection string
 */
export function sanitizeConnectionString(url) {
  if (typeof url !== "string" || url.length === 0) {
    throw new Error("sanitizeConnectionString: url must be a non-empty string.");
  }
  // WHATWG URL parses postgres:// URLs; searchParams round-trips correctly.
  const parsed = new URL(url);
  for (const key of SSL_URL_PARAMS) parsed.searchParams.delete(key);
  return parsed.toString();
}

/**
 * Assembles a `pg` Pool/Client config with strict TLS via the Supabase CA.
 * The returned object is spread into the caller's own Pool options so the
 * caller controls pool sizing, timeouts, etc.
 *
 * @param {string} url raw connection string (POSTGRES_URL)
 * @returns {{ connectionString: string, ssl: { ca: string } }}
 */
export function buildPgConfig(url) {
  return {
    connectionString: sanitizeConnectionString(url),
    ssl: { ca: loadSupabaseCa() },
  };
}
