#!/usr/bin/env node
// 1011 curated-avatar-asset verifier — Phase 6.2.
//
// Replaces the dapvatar-driven verifier. Confirms:
//   • Only the two approved character directories exist under
//     /public/avatar-assets/v1/.
//   • Karim has exactly EXPECTED_KARIM_COUNT expressions.
//   • Kulthum has exactly EXPECTED_KULTHUM_COUNT expressions.
//   • Both defaults (Karim Happy, Kulthum Heart Eyes) are present.
//   • Every milestone-reaction file (star-eye, heart-eye, party,
//     mind-blowing) exists for both characters.
//
// Fails the build if anything is missing.

import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

const ROOT_DIR = join(ROOT, "public", "avatar-assets", "v1");
const EXPECTED_CHARACTERS = ["male-karim-white", "female-kulthum-white"];
const EXPECTED_EXPRESSIONS_PER_CHARACTER = 29;
const REQUIRED = [
  "male-karim-white/01-happy.png",
  "male-karim-white/05-heart-eye.png",
  "male-karim-white/08-star-eye.png",
  "male-karim-white/11-party.png",
  "male-karim-white/07-mind-blowing.png",
  "female-kulthum-white/01-happy.png",
  "female-kulthum-white/05-heart-eye.png",
  "female-kulthum-white/08-star-eye.png",
  "female-kulthum-white/11-party.png",
  "female-kulthum-white/07-mind-blowing.png",
];

function die(msg) {
  console.error(`[verify-1011-avatar-assets] FAIL: ${msg}`);
  process.exit(1);
}

function main() {
  if (!existsSync(ROOT_DIR)) {
    die(`root missing: ${ROOT_DIR}`);
  }

  const dirs = readdirSync(ROOT_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  const expected = [...EXPECTED_CHARACTERS].sort();
  if (dirs.length !== expected.length || dirs.some((d, i) => d !== expected[i])) {
    die(
      `character directories mismatch. Expected [${expected.join(", ")}], got [${dirs.join(", ")}]`,
    );
  }

  for (const char of EXPECTED_CHARACTERS) {
    const files = readdirSync(join(ROOT_DIR, char)).filter((f) => f.endsWith(".png"));
    if (files.length !== EXPECTED_EXPRESSIONS_PER_CHARACTER) {
      die(
        `${char} has ${files.length} PNGs, expected ${EXPECTED_EXPRESSIONS_PER_CHARACTER}`,
      );
    }
  }

  for (const rel of REQUIRED) {
    const p = join(ROOT_DIR, rel);
    if (!existsSync(p)) die(`required asset missing: ${rel}`);
    const size = statSync(p).size;
    if (size < 1024) die(`asset suspiciously small (${size}B): ${rel}`);
  }

  let bytes = 0;
  let count = 0;
  for (const char of EXPECTED_CHARACTERS) {
    for (const f of readdirSync(join(ROOT_DIR, char))) {
      if (!f.endsWith(".png")) continue;
      count++;
      bytes += statSync(join(ROOT_DIR, char, f)).size;
    }
  }
  console.log(
    `[verify-1011-avatar-assets] OK — 2 characters, ${count} PNGs, ${(bytes / 1024 / 1024).toFixed(2)} MB total.`,
  );
}

main();
