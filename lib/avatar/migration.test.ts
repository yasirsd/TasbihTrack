import { describe, expect, it } from "vitest";
import { sanitizeAvatarConfig, defaultAvatarFor } from "./config";
import { isLegacyPresetConfig } from "./config-v3";
import {
  DEFAULT_FEMALE_CHARACTER_ID,
  DEFAULT_FEMALE_POSTURE_ID,
  DEFAULT_MALE_CHARACTER_ID,
  DEFAULT_MALE_POSTURE_ID,
} from "./dapvatar-adapter";

/**
 * Phase 6.1 — legacy v1/v2 → Dapvatar default migration behaviour.
 *
 * Old configs are DISCARDED visually. `sanitizeAvatarConfig` returns
 * null for anything that isn't a valid v3 catalog entry, so any legacy
 * blob that reaches the server on `updateProfile` (e.g. from a
 * misbehaving client or old cached payload) is rejected — the row's
 * avatar_config falls to null and the renderer draws the BrandMark.
 *
 * Server-side SQL migration 0003_dapvatar_only.sql performs the actual
 * batch rewrite; these tests cover the runtime path.
 */

describe("Legacy v1/v2 configs are rejected — no old-art rendering", () => {
  const legacyMale = {
    preset: "male-01",
    skinTone: "s2",
    background: "b1",
    headwear: "kufi",
  };
  const legacyFemale = {
    preset: "female-01",
    skinTone: "s1",
    background: "b1",
    headwear: "hijab",
  };
  const legacyV2Male = {
    version: 2,
    preset: "male-02",
    skinTone: "s3",
    background: "b4",
    outfitTone: "o4",
  };

  it("v1 male preset → sanitizer returns null", () => {
    expect(sanitizeAvatarConfig(legacyMale)).toBeNull();
  });

  it("v1 female preset → sanitizer returns null", () => {
    expect(sanitizeAvatarConfig(legacyFemale)).toBeNull();
  });

  it("v2 male preset → sanitizer returns null", () => {
    expect(sanitizeAvatarConfig(legacyV2Male)).toBeNull();
  });

  it("isLegacyPresetConfig recognises the shape for migration purposes only", () => {
    expect(isLegacyPresetConfig(legacyMale)).toBe(true);
    expect(isLegacyPresetConfig(legacyFemale)).toBe(true);
    expect(isLegacyPresetConfig(legacyV2Male)).toBe(true);
    expect(isLegacyPresetConfig({ preset: "neutral-01" })).toBe(true);
  });
});

describe("Effective post-migration defaults per gender", () => {
  // The DB-level migration in 0003_dapvatar_only.sql rewrites legacy
  // configs to these exact values. The application default helper
  // returns the same values so registration + fallback are consistent.
  it("male → Karim + adult + white + Happy", () => {
    expect(defaultAvatarFor("male")).toEqual({
      version: 3,
      engine: "dapvatar",
      characterId: DEFAULT_MALE_CHARACTER_ID,
      postureId: DEFAULT_MALE_POSTURE_ID,
    });
  });

  it("female → Kulthum + adult + white + Heart Eyes", () => {
    expect(defaultAvatarFor("female")).toEqual({
      version: 3,
      engine: "dapvatar",
      characterId: DEFAULT_FEMALE_CHARACTER_ID,
      postureId: DEFAULT_FEMALE_POSTURE_ID,
    });
  });

  it("prefer_not_to_say → null (renderer draws 1011 BrandMark)", () => {
    expect(defaultAvatarFor("prefer_not_to_say")).toBeNull();
  });
});
