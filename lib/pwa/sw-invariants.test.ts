import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Phase 6.1.1 §2 & §3 — service-worker invariants that we can lock down
 * at the source level. The SW itself can't be executed in a unit test
 * without a full ServiceWorkerGlobalScope shim, so we verify the
 * contract by reading the source.
 *
 * Failing any of these means someone edited public/sw.js in a way that
 * either sweeps unrelated origin caches or persists an unsuccessful
 * / opaque response into the dedicated avatar cache.
 */

function readSw(): string {
  return readFileSync(path.join(process.cwd(), "public", "sw.js"), "utf8");
}

describe("Service worker — cache cleanup scope (§2)", () => {
  const sw = readSw();

  it("declares an owned-prefix allow list, not a wide 'delete everything except mine' sweep", () => {
    expect(sw).toContain('const OWNED_PREFIXES = ["1011-", "tasbih-"];');
    expect(sw).toContain(
      "const isOwned = (name) => OWNED_PREFIXES.some((p) => name.startsWith(p));",
    );
  });

  it("activate handler filters by isOwned BEFORE deleting", () => {
    // The delete list must be `isOwned(k) && k !== VERSION && k !== AVATAR_CACHE_NAME`.
    expect(sw).toMatch(/isOwned\(k\)[^)]*&&[^)]*k !== VERSION[^)]*&&[^)]*k !== AVATAR_CACHE_NAME/s);
  });

  it("does NOT contain the old broad-sweep pattern that dropped every non-matching cache", () => {
    // The unsafe pre-fix line was:
    //   keys.filter((k) => k !== VERSION && k !== AVATAR_CACHE_NAME)
    // ...without any isOwned guard. Grep for that exact shape absent
    // an isOwned prefix.
    const broadSweep =
      /keys\s*\.filter\(\(k\)\s*=>\s*k !== VERSION && k !== AVATAR_CACHE_NAME\)/;
    expect(sw).not.toMatch(broadSweep);
  });
});

describe("Service worker — avatar cache success criteria (§3)", () => {
  const sw = readSw();

  it("only writes responses to the dedicated avatar cache when res.ok AND res.type === 'basic'", () => {
    // Both conditions must be present at the cache.put site.
    expect(sw).toMatch(/res\.ok && res\.type === "basic"/);
    // The put itself is guarded by that combined predicate.
    expect(sw).toMatch(/if \(res && res\.ok && res\.type === "basic"\)[\s\S]*cache\.put/);
  });

  it("does NOT contain the pre-fix pattern that cached on res.ok alone", () => {
    // Without the type check we would silently persist an opaque
    // cross-origin response if a redirect ever hopped origins.
    expect(sw).not.toMatch(/if \(res && res\.ok\)\s*\{[^}]*cache\.put/);
  });

  it("filters by same-origin at the top of the fetch handler (defence in depth)", () => {
    expect(sw).toContain("if (url.origin !== self.location.origin) return;");
  });
});
