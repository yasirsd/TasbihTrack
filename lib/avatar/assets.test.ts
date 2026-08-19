import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  AVATAR_ASSETS_AVAILABLE,
  EXPECTED_ASSET_PRESET_IDS,
  assetPathFor,
  hasPremiumAsset,
} from "./assets";
import { PRESETS } from "./config";

function read(rel: string): string {
  return readFileSync(path.join(process.cwd(), rel), "utf8");
}

describe("Premium avatar asset registry", () => {
  it("assetPathFor returns the /avatars/v2/<preset>.webp path", () => {
    for (const p of PRESETS) {
      expect(assetPathFor(p.id)).toBe(`/avatars/v2/${p.id}.webp`);
    }
  });

  it("hasPremiumAsset reads AVATAR_ASSETS_AVAILABLE", () => {
    // With no assets shipped, no preset should report as premium.
    for (const p of PRESETS) {
      expect(hasPremiumAsset(p.id)).toBe(
        AVATAR_ASSETS_AVAILABLE[p.id] === true,
      );
    }
  });

  it("EXPECTED_ASSET_PRESET_IDS enumerates every preset once", () => {
    expect(EXPECTED_ASSET_PRESET_IDS.length).toBe(PRESETS.length);
    const uniq = new Set(EXPECTED_ASSET_PRESET_IDS);
    expect(uniq.size).toBe(PRESETS.length);
    for (const p of PRESETS) expect(uniq.has(p.id)).toBe(true);
  });

  it("AVATAR_MANIFEST.md lists every current preset id at least once", () => {
    const manifest = read("public/avatars/v2/AVATAR_MANIFEST.md");
    for (const p of PRESETS) {
      expect(manifest, `preset ${p.id} missing from manifest`).toContain(`${p.id}.webp`);
    }
  });

  it("registry never references an unknown preset id", () => {
    const known = new Set(PRESETS.map((p) => p.id));
    for (const id of Object.keys(AVATAR_ASSETS_AVAILABLE)) {
      expect(known.has(id), `unknown preset in registry: ${id}`).toBe(true);
    }
  });
});
