import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

/**
 * Phase 6.1 invariant: the old SVG avatar rendering system is completely
 * gone from the production rendering path.
 *
 * These are source-level assertions — cheap, deterministic, and they
 * prevent a well-meaning future edit from re-introducing the old
 * TasbihAvatar renderer without also updating this file.
 */

function read(rel: string): string {
  return readFileSync(path.join(process.cwd(), rel), "utf8");
}

describe("No old-avatar rendering reachable from UserAvatar", () => {
  it("the old <TasbihAvatar> component file is deleted", () => {
    expect(existsSync(path.join(process.cwd(), "components/avatar/tasbih-avatar.tsx"))).toBe(
      false,
    );
  });

  it("the old assets registry is deleted", () => {
    expect(existsSync(path.join(process.cwd(), "lib/avatar/assets.ts"))).toBe(false);
  });

  it("the old brand-derived-avatar helper is deleted", () => {
    expect(existsSync(path.join(process.cwd(), "lib/avatar/brand.ts"))).toBe(false);
  });

  it("no premium-asset SVG directory ships under /public/avatars/", () => {
    expect(existsSync(path.join(process.cwd(), "public/avatars"))).toBe(false);
  });

  it("UserAvatar does not import the old TasbihAvatar renderer", () => {
    const src = read("components/avatar/user-avatar.tsx");
    // No live import from the old renderer file, and no JSX usage of the
    // old component. The name may still appear in the docstring — that's
    // a positive marker (documents that it's gone), not a regression.
    expect(src).not.toMatch(/from ["']@\/components\/avatar\/tasbih-avatar["']/);
    expect(src).not.toMatch(/<TasbihAvatar[\s>]/);
  });

  it("UserAvatar has exactly two render outcomes: Dapvatar <img> or BrandMark", () => {
    const src = read("components/avatar/user-avatar.tsx");
    // The <img> path AND the <BrandMark> path both exist in the file.
    expect(src).toMatch(/<img/);
    expect(src).toMatch(/<BrandMark/);
  });

  it("the top-level avatar sanitizer only accepts v3 (delegates to sanitizeAvatarConfigV3)", () => {
    const src = read("lib/avatar/config.ts");
    expect(src).toMatch(/sanitizeAvatarConfigV3/);
    // The old preset registry (SKIN_TONES, PRESETS, presetsForGender) is gone.
    expect(src).not.toMatch(/SKIN_TONES/);
    expect(src).not.toMatch(/PRESETS/);
    expect(src).not.toMatch(/presetsForGender/);
  });
});
