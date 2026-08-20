import { describe, expect, it } from "vitest";
import {
  AVATAR_ASSET_BASE,
  DEFAULT_FEMALE_CHARACTER_ID,
  DEFAULT_FEMALE_POSTURE_ID,
  DEFAULT_MALE_CHARACTER_ID,
  DEFAULT_MALE_POSTURE_ID,
  avatarAssetUrl,
  avatarAssetUrlFromPostureId,
  avatarPreviewAssetUrl,
  characterIdFromPostureId,
  postureKeyFromPostureId,
  postureLabel,
  reactionPostureIdFor,
} from "./avatar-engine";

describe("avatar adapter — Phase 6.2 versioned URL derivation", () => {
  it("asset base matches the curated 1011 asset set version (v1)", () => {
    expect(AVATAR_ASSET_BASE).toBe("/avatar-assets/v1");
  });

  it("derives a URL from a real posture id", () => {
    expect(avatarAssetUrlFromPostureId(DEFAULT_FEMALE_POSTURE_ID)).toBe(
      `${AVATAR_ASSET_BASE}/female-kulthum-white/05-heart-eye.png`,
    );
    expect(avatarAssetUrlFromPostureId(DEFAULT_MALE_POSTURE_ID)).toBe(
      `${AVATAR_ASSET_BASE}/male-karim-white/01-happy.png`,
    );
  });

  it("returns null for a posture id whose character isn't in the curated set", () => {
    // Karim-black existed in dapvatar 0.1.4 but is not part of Phase 6.2.
    expect(
      avatarAssetUrlFromPostureId("male-karim-black-1-happy"),
    ).toBeNull();
    expect(
      avatarAssetUrlFromPostureId("female-kulthum-black-5-heart-eye"),
    ).toBeNull();
    expect(avatarAssetUrlFromPostureId("male-justin-white-1-happy")).toBeNull();
  });

  it("returns null for malformed posture ids (no traversal, no crash)", () => {
    for (const bad of [null, undefined, "", "hackerman", "../../../etc/passwd"]) {
      expect(avatarAssetUrlFromPostureId(bad)).toBeNull();
    }
  });

  it("preview URL uses the character's happy face for approved characters only", () => {
    expect(avatarPreviewAssetUrl(DEFAULT_FEMALE_CHARACTER_ID)).toBe(
      `${AVATAR_ASSET_BASE}/female-kulthum-white/01-happy.png`,
    );
    expect(avatarPreviewAssetUrl("male-justin-white")).toBeNull();
  });

  it("avatarAssetUrl pads and requires curated character", () => {
    expect(avatarAssetUrl(DEFAULT_MALE_CHARACTER_ID, 1, "happy")).toBe(
      `${AVATAR_ASSET_BASE}/male-karim-white/01-happy.png`,
    );
    expect(avatarAssetUrl(DEFAULT_MALE_CHARACTER_ID, 20, "like")).toBe(
      `${AVATAR_ASSET_BASE}/male-karim-white/20-like.png`,
    );
    expect(avatarAssetUrl("male-justin-white", 1, "happy")).toBeNull();
  });

  it("extracts character id + posture key from a posture id", () => {
    expect(characterIdFromPostureId(DEFAULT_FEMALE_POSTURE_ID)).toBe(
      DEFAULT_FEMALE_CHARACTER_ID,
    );
    expect(postureKeyFromPostureId(DEFAULT_FEMALE_POSTURE_ID)).toBe("heart-eye");
    expect(postureKeyFromPostureId("male-karim-white-11-party")).toBe("party");
  });
});

describe("Reaction lookup (curated manifest only, no dapvatar catalog)", () => {
  it("resolves reaction posture ids against approved characters", () => {
    expect(reactionPostureIdFor(DEFAULT_FEMALE_CHARACTER_ID, "heart-eye")).toBe(
      DEFAULT_FEMALE_POSTURE_ID,
    );
    expect(reactionPostureIdFor(DEFAULT_MALE_CHARACTER_ID, "party")).toBe(
      "male-karim-white-11-party",
    );
    expect(reactionPostureIdFor(DEFAULT_FEMALE_CHARACTER_ID, "mind-blowing")).toBe(
      "female-kulthum-white-7-mind-blowing",
    );
  });

  it("returns null for a non-curated character even if the historical dapvatar catalog had it", () => {
    expect(reactionPostureIdFor("male-justin-white", "party")).toBeNull();
    expect(reactionPostureIdFor("female-kulthum-black", "heart-eye")).toBeNull();
  });

  it("returns null for a missing expression key", () => {
    expect(
      reactionPostureIdFor(DEFAULT_MALE_CHARACTER_ID, "not-a-real-key"),
    ).toBeNull();
  });
});

describe("Human labels", () => {
  it("known posture keys use the curated label", () => {
    expect(postureLabel("heart-eye")).toBe("Heart Eyes");
    expect(postureLabel("mind-blowing")).toBe("Mind Blown");
    expect(postureLabel("star-eye")).toBe("Star Eyes");
    expect(postureLabel("fist-pump")).toBe("Fist Pump");
    expect(postureLabel("shush")).toBe("Shush");
  });

  it("unknown keys fall back to hyphen → Title Case (never raw slug)", () => {
    expect(postureLabel("gigantic-yawn")).toBe("Gigantic Yawn");
  });
});
