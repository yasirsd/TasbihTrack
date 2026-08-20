#!/usr/bin/env node
/**
 * Phase 7.2 P0.2 — regenerate the PNG assets iOS and Android need for
 * Home Screen / PWA installation.
 *
 * Rasterises the SVG sources in `public/icons/source/` into stable,
 * versioned PNG files under `public/icons/`. Safe to invoke by hand —
 * outputs are pure functions of the inputs, so committing them keeps
 * CI reproducible.
 *
 * Root cause this script exists to fix: iOS Safari does NOT honour
 * SVG for the apple-touch-icon slot. Before this pass the app only
 * shipped SVG icons and iOS was falling back to a rasterised web-clip
 * preview — which rendered as the notorious "silver 1" tile.
 *
 * Outputs (versioned filenames to bust iOS's aggressive icon cache):
 *   public/icons/apple-touch-icon-v2-180.png     — iOS Home Screen
 *   public/icons/icon-v2-192.png                 — PWA manifest, purpose: any
 *   public/icons/icon-v2-512.png                 — PWA manifest, purpose: any
 *   public/icons/icon-maskable-v2-512.png        — PWA manifest, purpose: maskable
 *
 * If we ever ship another visual revision, bump the "v2" segment in
 * TARGETS below (and in the referencing manifest / metadata / SW).
 * That's the whole cache-bust strategy — no query strings anywhere.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SRC_DIR = path.join(ROOT, "public", "icons", "source");
const OUT_DIR = path.join(ROOT, "public", "icons");

/** [sourceSvgFilename, outputPngFilename, sizePx] */
const TARGETS = [
  ["icon-source.svg",           "apple-touch-icon-v2-180.png",  180],
  ["icon-source.svg",           "icon-v2-192.png",              192],
  ["icon-source.svg",           "icon-v2-512.png",              512],
  ["icon-source-maskable.svg",  "icon-maskable-v2-512.png",     512],
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const summary = [];
  for (const [srcName, outName, size] of TARGETS) {
    const srcPath = path.join(SRC_DIR, srcName);
    const outPath = path.join(OUT_DIR, outName);
    const svg = await readFile(srcPath);

    // sharp rasterises the SVG at the requested pixel dimensions and
    // encodes as PNG. `flatten` against the brand dark ensures the
    // output is fully opaque — iOS treats transparent apple-touch
    // images as an invalid asset and falls back to the silver web-clip
    // preview, which is exactly the bug we're fixing.
    const png = await sharp(svg, { density: 384 })
      .resize(size, size, { fit: "cover" })
      .flatten({ background: "#09090B" })
      .png({ compressionLevel: 9 })
      .toBuffer();

    await writeFile(outPath, png);

    // Sanity-check the rendered PNG matches the target size. Catches
    // misconfigured sharp options before the next build ships stale
    // artwork.
    const [w, h] = readPngDimensions(png);
    if (w !== size || h !== size) {
      throw new Error(
        `[generate-pwa-icons] ${outName} rendered as ${w}x${h}, expected ${size}x${size}`,
      );
    }

    summary.push(`  ${outName.padEnd(32)} ${size}x${size}  (${png.length.toLocaleString()} bytes)`);
  }

  process.stdout.write(
    "[generate-pwa-icons] OK — regenerated PWA icon PNGs:\n" +
      summary.join("\n") +
      "\n",
  );
}

/** Read width + height from a PNG buffer's IHDR chunk. */
function readPngDimensions(buf) {
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  return [w, h];
}

main().catch((err) => {
  process.stderr.write(`[generate-pwa-icons] FAILED — ${err.stack ?? err}\n`);
  process.exit(1);
});
