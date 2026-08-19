#!/usr/bin/env node
/**
 * Scan public/avatars/v2/*.webp and rewrite AVATAR_ASSETS_AVAILABLE
 * inside lib/avatar/assets.ts so the runtime knows which premium 3D
 * assets are actually present on disk. Idempotent — safe to run any
 * number of times.
 *
 * Usage:
 *   node scripts/scan-avatar-assets.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ASSET_DIR = path.join(ROOT, "public", "avatars", "v2");
const REGISTRY_FILE = path.join(ROOT, "lib", "avatar", "assets.ts");

if (!fs.existsSync(ASSET_DIR)) {
  console.error(`avatar dir not found: ${ASSET_DIR}`);
  process.exit(1);
}

const files = fs
  .readdirSync(ASSET_DIR)
  .filter((f) => f.endsWith(".webp"))
  .map((f) => f.replace(/\.webp$/, ""))
  .sort();

const registryLines = files.length
  ? files.map((id) => `  "${id}": true,`).join("\n")
  : "  // (no premium 3D assets present)";

const registryBlock = `Object.freeze({\n${registryLines}\n})`;

const src = fs.readFileSync(REGISTRY_FILE, "utf8");
const patched = src.replace(
  /export const AVATAR_ASSETS_AVAILABLE:[^=]*= [^;]*;/s,
  `export const AVATAR_ASSETS_AVAILABLE: Readonly<Record<string, true>> = ${registryBlock};`,
);

if (patched === src) {
  console.error(
    "Could not locate the AVATAR_ASSETS_AVAILABLE declaration in lib/avatar/assets.ts",
  );
  process.exit(1);
}

fs.writeFileSync(REGISTRY_FILE, patched);
console.log(
  files.length
    ? `Registered ${files.length} premium avatar asset(s): ${files.join(", ")}`
    : "No premium avatar assets found — registry left empty.",
);
