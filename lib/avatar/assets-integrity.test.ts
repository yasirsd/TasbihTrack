import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import {
  AVATAR_ASSET_BASE,
  DEFAULT_FEMALE_POSTURE_ID,
  DEFAULT_MALE_POSTURE_ID,
  avatarAssetUrlFromPostureId,
} from "./dapvatar-adapter";
import { AVATAR_ASSET_SET_VERSION, KARIM, KULTHUM } from "./manifest";

function assetPathFromUrl(url: string): string {
  return path.join(process.cwd(), "public", url.replace(/^\//, ""));
}

describe("Curated 1011 avatar assets — Phase 6.2", () => {
  it("asset base uses the curated set version (v1)", () => {
    expect(AVATAR_ASSET_BASE).toBe(`/avatar-assets/${AVATAR_ASSET_SET_VERSION}`);
  });

  it("male default (Karim Happy) exists on disk", () => {
    const url = avatarAssetUrlFromPostureId(DEFAULT_MALE_POSTURE_ID)!;
    const abs = assetPathFromUrl(url);
    expect(existsSync(abs)).toBe(true);
    expect(statSync(abs).size).toBeGreaterThan(1024);
  });

  it("female default (Kulthum Heart Eyes) exists on disk", () => {
    const url = avatarAssetUrlFromPostureId(DEFAULT_FEMALE_POSTURE_ID)!;
    const abs = assetPathFromUrl(url);
    expect(existsSync(abs)).toBe(true);
    expect(statSync(abs).size).toBeGreaterThan(1024);
  });

  it("every posture in the manifest resolves to a physical PNG", () => {
    for (const char of [KARIM, KULTHUM]) {
      for (const p of char.expressions) {
        const url = `${AVATAR_ASSET_BASE}/${char.id}/${p.asset}`;
        const abs = assetPathFromUrl(url);
        expect(existsSync(abs), `${char.id}/${p.asset}`).toBe(true);
      }
    }
  });

  it("only the two approved character directories exist — no historical strays", () => {
    const root = path.join(
      process.cwd(),
      "public",
      "avatar-assets",
      AVATAR_ASSET_SET_VERSION,
    );
    if (!existsSync(root)) return;
    const dirs = readdirSync(root, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
    expect(dirs).toEqual(["female-kulthum-white", "male-karim-white"]);
  });

  it("no 70-MB pre-Phase-6.2 memoji directory ships in /public", () => {
    // The old versioned path was /public/memoji-assets/vX.Y.Z/. If it
    // ever comes back it's a regression to the discarded 1,622-asset
    // architecture.
    expect(existsSync(path.join(process.cwd(), "public", "memoji-assets"))).toBe(false);
  });

  it("dapvatar npm dependency is removed from package.json", () => {
    const pkg = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
    expect(pkg.dependencies?.dapvatar).toBeUndefined();
    expect(pkg.devDependencies?.dapvatar).toBeUndefined();
  });

  it("service worker declares the matching curated cache namespace + path", () => {
    const sw = readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8");
    expect(sw).toContain(`const AVATAR_SET_VERSION = "${AVATAR_ASSET_SET_VERSION}";`);
    expect(sw).toContain('const AVATAR_CACHE_NAME = "1011-avatar-" + AVATAR_SET_VERSION;');
    expect(sw).toContain(
      'const AVATAR_PATH_PREFIX = "/avatar-assets/" + AVATAR_SET_VERSION + "/";',
    );
  });
});
