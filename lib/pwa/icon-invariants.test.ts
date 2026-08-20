import { describe, expect, it } from "vitest";
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Phase 7.2 P0.2 — iOS PWA icon hotfix invariants.
 *
 * Before this pass the only shipped icons were SVG. iOS Safari does not
 * honour SVG for the apple-touch-icon slot and fell back to a
 * rasterised web-clip preview — the "silver 1" tile on the Home Screen.
 * These tests lock down the fix so a future refactor can't quietly
 * regress the assets or metadata that must now travel to real devices.
 */

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const PUBLIC = path.join(REPO_ROOT, "public");
const ICONS = path.join(PUBLIC, "icons");

function pngDimensions(buf: Buffer): [number, number] {
  // PNG: 8-byte signature, then IHDR chunk starting at offset 8:
  //   length (4) + "IHDR" (4) + width (4) + height (4) + rest
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

describe("PWA icon PNGs", () => {
  it("apple-touch-icon PNG exists and is exactly 180x180", () => {
    const p = path.join(ICONS, "apple-touch-icon-v2-180.png");
    expect(existsSync(p)).toBe(true);
    const buf = readFileSync(p);
    const [w, h] = pngDimensions(buf);
    expect(w).toBe(180);
    expect(h).toBe(180);
    // Sanity — must be a real PNG, not a placeholder.
    expect(statSync(p).size).toBeGreaterThan(500);
  });

  it("manifest 192 PNG exists and is exactly 192x192", () => {
    const p = path.join(ICONS, "icon-v2-192.png");
    expect(existsSync(p)).toBe(true);
    const [w, h] = pngDimensions(readFileSync(p));
    expect(w).toBe(192);
    expect(h).toBe(192);
  });

  it("manifest 512 PNG exists and is exactly 512x512", () => {
    const p = path.join(ICONS, "icon-v2-512.png");
    expect(existsSync(p)).toBe(true);
    const [w, h] = pngDimensions(readFileSync(p));
    expect(w).toBe(512);
    expect(h).toBe(512);
  });

  it("maskable 512 PNG exists and is exactly 512x512", () => {
    const p = path.join(ICONS, "icon-maskable-v2-512.png");
    expect(existsSync(p)).toBe(true);
    const [w, h] = pngDimensions(readFileSync(p));
    expect(w).toBe(512);
    expect(h).toBe(512);
  });
});

describe("Web app manifest", () => {
  const manifest = JSON.parse(
    readFileSync(path.join(PUBLIC, "manifest.webmanifest"), "utf8"),
  ) as {
    name: string;
    short_name?: string;
    icons: { src: string; sizes: string; type: string; purpose?: string }[];
  };

  it("uses the current app name (1011 Tracker), not any legacy brand", () => {
    expect(manifest.name).toBe("1011 Tracker");
    expect(manifest.short_name?.toLowerCase()).not.toContain("tasbih");
    expect(manifest.name.toLowerCase()).not.toContain("tasbih");
  });

  it("declares 192 and 512 PNG icons for purpose:any", () => {
    const p192 = manifest.icons.find(
      (i) => i.sizes === "192x192" && i.type === "image/png" && (i.purpose ?? "any").includes("any"),
    );
    const p512 = manifest.icons.find(
      (i) => i.sizes === "512x512" && i.type === "image/png" && (i.purpose ?? "any").includes("any"),
    );
    expect(p192, "192x192 PNG missing from manifest icons").toBeTruthy();
    expect(p512, "512x512 PNG missing from manifest icons").toBeTruthy();
  });

  it("declares a maskable PNG icon", () => {
    const maskable = manifest.icons.find(
      (i) => (i.purpose ?? "").includes("maskable") && i.type === "image/png",
    );
    expect(maskable, "no maskable PNG declared").toBeTruthy();
  });

  it("does not point primary icons at the legacy SVG (which iOS ignores)", () => {
    // The old code shipped SVG as the primary purpose:any icon, which
    // was one contributor to the silver-fallback bug. Keeping SVG as a
    // secondary entry is fine, but no primary size may reference it.
    const primaries = manifest.icons.filter(
      (i) => (i.purpose ?? "any").includes("any") && i.sizes !== "any",
    );
    for (const p of primaries) {
      expect(p.type, `primary icon ${p.src} is not PNG`).toBe("image/png");
    }
  });
});

describe("Root layout metadata", () => {
  const layout = readFileSync(
    path.join(REPO_ROOT, "app", "layout.tsx"),
    "utf8",
  );

  it("references the new Apple touch PNG in the apple icon slot", () => {
    expect(layout).toContain("/icons/apple-touch-icon-v2-180.png");
    expect(layout).toContain('sizes: "180x180"');
  });

  it("keeps the 1011 Tracker application name + appleWebApp title", () => {
    expect(layout).toContain('applicationName: "1011 Tracker"');
    expect(layout).toContain('title: "1011 Tracker"');
  });

  it("no longer points the apple icon at the legacy SVG", () => {
    // Old: `apple: [{ url: "/icons/icon.svg", type: "image/svg+xml" }]`
    // Must not be a live apple reference any more.
    expect(layout).not.toMatch(/apple:\s*\[\s*\{\s*url:\s*"\/icons\/icon\.svg"/);
  });
});

describe("Service worker precache", () => {
  const sw = readFileSync(path.join(PUBLIC, "sw.js"), "utf8");

  it("precaches the new Apple touch PNG so offline installs still show branded artwork", () => {
    expect(sw).toContain("/icons/apple-touch-icon-v2-180.png");
    expect(sw).toContain("/icons/icon-v2-192.png");
    expect(sw).toContain("/icons/icon-v2-512.png");
  });

  it("no longer precaches the retired /icons/icon.svg as a primary asset", () => {
    // The SVG source may still live in /public/icons/source/ but must
    // NOT be listed in the shell precache addAll list; iOS/Android
    // installers should be reaching the PNGs instead.
    const precacheBlock = sw.match(/addAll\(\[[\s\S]*?\]\)/)?.[0] ?? "";
    expect(precacheBlock).not.toContain('"/icons/icon.svg"');
  });

  it("bumped the app-shell VERSION so devices swap to the new icon list", () => {
    // Any 1011-vN with N >= 5 is acceptable; hard-coding v5 gives a
    // named regression signal if someone reverts.
    expect(sw).toMatch(/const VERSION = "1011-v[5-9]|1011-v[1-9]\d+"/);
  });
});
