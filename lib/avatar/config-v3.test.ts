import { describe, expect, it } from "vitest";
import {
  avatarForGenderTransition,
  defaultV3ForGender,
  isLegacyPresetConfig,
  isV3Config,
  sanitizeAvatarConfigV3,
  sanitizeAvatarConfigV3ForGender,
} from "./config-v3";
import { sanitizeAvatarConfig, defaultAvatarFor } from "./config";
import {
  DEFAULT_FEMALE_CHARACTER_ID,
  DEFAULT_FEMALE_POSTURE_ID,
  DEFAULT_MALE_CHARACTER_ID,
  DEFAULT_MALE_POSTURE_ID,
} from "./dapvatar-adapter";
import {
  AVATAR_CHARACTERS,
  AVATAR_CHARACTER_BY_ID,
} from "./manifest";
import type { AvatarConfigV3 } from "@/lib/data/types";

const VALID_FEMALE: AvatarConfigV3 = {
  version: 3,
  engine: "dapvatar",
  characterId: DEFAULT_FEMALE_CHARACTER_ID,
  postureId: DEFAULT_FEMALE_POSTURE_ID,
};

const VALID_MALE: AvatarConfigV3 = {
  version: 3,
  engine: "dapvatar",
  characterId: DEFAULT_MALE_CHARACTER_ID,
  postureId: DEFAULT_MALE_POSTURE_ID,
};

describe("Curated manifest — exactly two characters", () => {
  it("AVATAR_CHARACTERS has length 2, both are white", () => {
    expect(AVATAR_CHARACTERS.length).toBe(2);
    expect(AVATAR_CHARACTER_BY_ID["male-karim-white"]).toBeDefined();
    expect(AVATAR_CHARACTER_BY_ID["female-kulthum-white"]).toBeDefined();
    expect(AVATAR_CHARACTER_BY_ID["male-karim-black"]).toBeUndefined();
    expect(AVATAR_CHARACTER_BY_ID["female-kulthum-black"]).toBeUndefined();
    expect(AVATAR_CHARACTER_BY_ID["male-justin-white"]).toBeUndefined();
  });

  it("each character has 29 expressions", () => {
    for (const c of AVATAR_CHARACTERS) {
      expect(c.expressions.length).toBe(29);
    }
  });

  it("defaults are Karim + Happy / Kulthum + Heart Eyes", () => {
    expect(defaultV3ForGender("male")).toEqual(VALID_MALE);
    expect(defaultV3ForGender("female")).toEqual(VALID_FEMALE);
    expect(defaultV3ForGender("prefer_not_to_say")).toBeNull();
  });

  it("defaultAvatarFor delegates identically", () => {
    expect(defaultAvatarFor("male")).toEqual(VALID_MALE);
    expect(defaultAvatarFor("female")).toEqual(VALID_FEMALE);
    expect(defaultAvatarFor("prefer_not_to_say")).toBeNull();
  });
});

describe("sanitizeAvatarConfigV3 — allowlist rejects everything else", () => {
  it("accepts real defaults", () => {
    expect(sanitizeAvatarConfigV3(VALID_FEMALE)).toEqual(VALID_FEMALE);
    expect(sanitizeAvatarConfigV3(VALID_MALE)).toEqual(VALID_MALE);
  });

  it("rejects karim-black (historical dapvatar character no longer in 1011)", () => {
    expect(
      sanitizeAvatarConfigV3({
        version: 3,
        engine: "dapvatar",
        characterId: "male-karim-black",
        postureId: "male-karim-black-1-happy",
      }),
    ).toBeNull();
  });

  it("rejects kulthum-black", () => {
    expect(
      sanitizeAvatarConfigV3({
        version: 3,
        engine: "dapvatar",
        characterId: "female-kulthum-black",
        postureId: "female-kulthum-black-5-heart-eye",
      }),
    ).toBeNull();
  });

  it("rejects justin-white and any other historical character", () => {
    for (const bad of [
      "male-justin-white",
      "male-justin-black",
      "female-ariana-white",
      "female-angela-black",
    ]) {
      expect(
        sanitizeAvatarConfigV3({
          version: 3,
          engine: "dapvatar",
          characterId: bad,
          postureId: `${bad}-1-happy`,
        }),
      ).toBeNull();
    }
  });

  it("rejects nonexistent posture on a valid character", () => {
    expect(
      sanitizeAvatarConfigV3({
        version: 3,
        engine: "dapvatar",
        characterId: DEFAULT_FEMALE_CHARACTER_ID,
        postureId: `${DEFAULT_FEMALE_CHARACTER_ID}-99-happy`,
      }),
    ).toBeNull();
  });

  it("rejects cross-character posture (Kulthum id + Karim posture)", () => {
    expect(
      sanitizeAvatarConfigV3({
        version: 3,
        engine: "dapvatar",
        characterId: DEFAULT_FEMALE_CHARACTER_ID,
        postureId: DEFAULT_MALE_POSTURE_ID,
      }),
    ).toBeNull();
  });

  it("rejects wrong version, unknown engine, oversized ids, primitives", () => {
    expect(sanitizeAvatarConfigV3({ ...VALID_MALE, version: 2 })).toBeNull();
    expect(sanitizeAvatarConfigV3({ ...VALID_MALE, engine: "svg" })).toBeNull();
    expect(
      sanitizeAvatarConfigV3({ ...VALID_MALE, characterId: "x".repeat(200) }),
    ).toBeNull();
    for (const bad of [null, undefined, "", "kulthum", 42, true, []]) {
      expect(sanitizeAvatarConfigV3(bad)).toBeNull();
    }
  });
});

describe("sanitizeAvatarConfigV3ForGender — gender-scoped allowlist", () => {
  it("male gender accepts Karim, rejects Kulthum", () => {
    expect(sanitizeAvatarConfigV3ForGender(VALID_MALE, "male")).toEqual(VALID_MALE);
    expect(sanitizeAvatarConfigV3ForGender(VALID_FEMALE, "male")).toBeNull();
  });

  it("female gender accepts Kulthum, rejects Karim", () => {
    expect(sanitizeAvatarConfigV3ForGender(VALID_FEMALE, "female")).toEqual(
      VALID_FEMALE,
    );
    expect(sanitizeAvatarConfigV3ForGender(VALID_MALE, "female")).toBeNull();
  });

  it("neutral gender cannot persist any human avatar", () => {
    expect(sanitizeAvatarConfigV3ForGender(VALID_MALE, "prefer_not_to_say")).toBeNull();
    expect(sanitizeAvatarConfigV3ForGender(VALID_FEMALE, "prefer_not_to_say")).toBeNull();
    expect(sanitizeAvatarConfigV3ForGender(VALID_MALE, null)).toBeNull();
  });
});

describe("avatarForGenderTransition — server-side gender-change logic", () => {
  it("Karim + Party → Kulthum + Party (expression preserved when available)", () => {
    const before: AvatarConfigV3 = {
      ...VALID_MALE,
      postureId: "male-karim-white-11-party",
    };
    const after = avatarForGenderTransition("male", "female", before);
    expect(after).toEqual({
      version: 3,
      engine: "dapvatar",
      characterId: DEFAULT_FEMALE_CHARACTER_ID,
      postureId: "female-kulthum-white-11-party",
    });
  });

  it("Kulthum + Heart Eyes → Karim + Heart Eyes (expression preserved)", () => {
    const after = avatarForGenderTransition("female", "male", VALID_FEMALE);
    expect(after?.postureId).toBe("male-karim-white-5-heart-eye");
  });

  it("Karim (unusual expression missing on Kulthum) → Kulthum + Heart Eyes default", () => {
    // Contrived — both characters share every key in the curated set, so
    // fabricate a scenario where the current key isn't found.
    const weird: AvatarConfigV3 = {
      ...VALID_MALE,
      postureId: "male-karim-white-99-imaginary",
    };
    const after = avatarForGenderTransition("male", "female", weird);
    expect(after?.postureId).toBe(DEFAULT_FEMALE_POSTURE_ID);
  });

  it("Male/Female → Neutral clears the avatar (null → BrandMark)", () => {
    expect(avatarForGenderTransition("male", "prefer_not_to_say", VALID_MALE)).toBeNull();
    expect(avatarForGenderTransition("female", "prefer_not_to_say", VALID_FEMALE)).toBeNull();
  });

  it("Neutral → Male returns Karim + Happy", () => {
    expect(avatarForGenderTransition("prefer_not_to_say", "male", null)).toEqual(VALID_MALE);
  });

  it("Neutral → Female returns Kulthum + Heart Eyes", () => {
    expect(avatarForGenderTransition(null, "female", null)).toEqual(VALID_FEMALE);
  });
});

describe("Top-level sanitizeAvatarConfig — v3 only", () => {
  it("round-trips a v3 payload from the curated set", () => {
    expect(sanitizeAvatarConfig(VALID_FEMALE)).toEqual(VALID_FEMALE);
    expect(isV3Config(sanitizeAvatarConfig(VALID_FEMALE))).toBe(true);
  });

  it("rejects legacy v1/v2 preset payloads", () => {
    expect(
      sanitizeAvatarConfig({
        preset: "male-01",
        skinTone: "s2",
        background: "b1",
        headwear: "kufi",
      }),
    ).toBeNull();
  });
});

describe("isLegacyPresetConfig — migration/import detection only", () => {
  it("recognises v1/v2 preset shape", () => {
    expect(isLegacyPresetConfig({ preset: "male-01" })).toBe(true);
    expect(isLegacyPresetConfig({ version: 2, preset: "female-01" })).toBe(true);
  });

  it("does NOT flag v3 or null as legacy", () => {
    expect(isLegacyPresetConfig(VALID_MALE)).toBe(false);
    expect(isLegacyPresetConfig(null)).toBe(false);
  });
});
