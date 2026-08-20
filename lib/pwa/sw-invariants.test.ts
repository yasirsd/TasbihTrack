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

describe("Service worker — no human-avatar precache at install (Phase 6.2.1 §1)", () => {
  const sw = readSw();

  it("install handler does NOT call cache.addAll on any /avatar-assets/v1/*.png", () => {
    // A male user must not download Kulthum artwork on install, and
    // vice versa. Human avatars cache-warm on first render instead —
    // enforced by keeping their URLs out of the install-time addAll.
    expect(sw).not.toMatch(/AVATAR_PATH_PREFIX \+ "male-karim-white/);
    expect(sw).not.toMatch(/AVATAR_PATH_PREFIX \+ "female-kulthum-white/);
    expect(sw).not.toMatch(/male-karim-white\/01-happy\.png/);
    expect(sw).not.toMatch(/female-kulthum-white\/05-heart-eye\.png/);
  });

  it("install does NOT even open the AVATAR_CACHE_NAME cache", () => {
    // The install path is now app-shell only; there's no reason to open
    // the dedicated avatar cache at install time.
    const install = sw.slice(sw.indexOf('addEventListener("install"'));
    const installBody = install.slice(0, install.indexOf('addEventListener("activate"'));
    expect(installBody).not.toContain("AVATAR_CACHE_NAME");
  });

  it("SW never reads any user identity to decide what to cache (stays identity-agnostic)", () => {
    // "gender" and "profile" appear only in explanatory comments and in
    // the /app/profile app-shell URL — those are positive markers, not
    // regressions. What we're actually guarding against is a code path
    // that branches on the signed-in user, so we check identifiers that
    // could only appear if such logic were introduced.
    expect(sw).not.toMatch(/\buserId\b/i);
    expect(sw).not.toMatch(/\bsessionUser\b/i);
    expect(sw).not.toMatch(/cookies?\./i);
    expect(sw).not.toMatch(/localStorage\./i);
    expect(sw).not.toMatch(/indexedDB\./i);
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
