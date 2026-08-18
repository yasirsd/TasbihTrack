#!/usr/bin/env node
// Verify the DB is reachable with strict TLS using the Supabase CA.
// Usage: `npm run db:test`
//
// Reuses lib/server/pg-config.mjs so the app's Pool config and this test
// share the identical URL sanitization + CA loading — they cannot drift.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Client } from "pg";
import { buildPgConfig } from "../lib/server/pg-config.mjs";

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  const text = fs.readFileSync(p, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    if (!rawLine || rawLine.trim().startsWith("#")) continue;
    const idx = rawLine.indexOf("=");
    if (idx < 0) continue;
    const key = rawLine.slice(0, idx).trim();
    let val = rawLine.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

async function main() {
  loadEnvLocal();

  const url = process.env.POSTGRES_URL;
  if (!url) {
    console.error("POSTGRES_URL is not set (checked .env.local and process env).");
    process.exit(1);
  }

  let config;
  try {
    config = buildPgConfig(url);
  } catch (err) {
    console.error(err?.message ?? String(err));
    process.exit(1);
  }

  const client = new Client(config);
  const started = Date.now();
  try {
    await client.connect();
    const res = await client.query("select 1 as ok");
    const elapsed = Date.now() - started;
    if (res.rows?.[0]?.ok === 1) {
      console.log(`OK — TLS-verified connection to Supabase Postgres. select 1 → 1 (${elapsed} ms)`);
    } else {
      console.error("Unexpected result:", res.rows);
      process.exit(1);
    }
    const encrypted = client.connection?.stream?.encrypted;
    if (encrypted) console.log("TLS negotiated: yes");
  } catch (err) {
    const msg = err?.message ?? String(err);
    console.error("DB test failed:", msg);
    if (String(msg).includes("SELF_SIGNED_CERT_IN_CHAIN")) {
      console.error(
        "\nHint: the CA certificate did not match Supabase's chain. Re-download " +
          "from Supabase Dashboard → Project Settings → Database → SSL Configuration → " +
          "Download Certificate.",
      );
    }
    process.exit(1);
  } finally {
    try {
      await client.end();
    } catch {
      /* ignore */
    }
  }
}

// Only run when invoked directly, not when imported.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
