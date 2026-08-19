import { describe, expect, it } from "vitest";
import { sanitizeAvatarConfig, defaultAvatarFor } from "./config";

describe("Avatar v1 → v2 migration", () => {
  it("accepts a legacy v1 config and up-converts (adds outfitTone default)", () => {
    // v1 shipped without outfitTone.
    const v1 = {
      preset: "male-01",
      skinTone: "s2",
      background: "b1",
      headwear: "kufi",
    };
    const v2 = sanitizeAvatarConfig(v1);
    expect(v2).not.toBeNull();
    expect(v2?.preset).toBe("male-01");
    expect(v2?.skinTone).toBe("s2");
    expect(v2?.background).toBe("b1");
    // Added by the migration:
    expect(v2?.outfitTone).toBe("o1"); // male-01's default
    // Headwear stays locked to the preset:
    expect(v2?.headwear).toBe("kufi");
  });

  it("v1 female config maps to hijab preset (no clothing swap)", () => {
    const out = sanitizeAvatarConfig({
      preset: "female-02",
      skinTone: "s2",
      background: "b3",
      headwear: "hijab",
    });
    expect(out?.headwear).toBe("hijab");
    expect(out?.outfitTone).toBe("o3"); // female-02's default
  });

  it("v1 neutral maps to the 1011 monogram preset", () => {
    const out = sanitizeAvatarConfig({
      preset: "neutral-01",
      skinTone: "s1",
      background: "b1",
      headwear: "none",
    });
    expect(out?.headwear).toBe("none");
    expect(out?.preset).toBe("neutral-01");
  });

  it("unknown outfitTone falls back to the preset default (no null pointer)", () => {
    const out = sanitizeAvatarConfig({
      preset: "male-01",
      outfitTone: "not-real",
    });
    expect(out?.outfitTone).toBe("o1");
  });

  it("unknown preset id is rejected outright", () => {
    expect(sanitizeAvatarConfig({ preset: "hackerman" })).toBeNull();
  });

  it("defaultAvatarFor produces a v2-compatible config that survives the sanitizer", () => {
    for (const g of ["male", "female", "prefer_not_to_say"] as const) {
      const def = defaultAvatarFor(g);
      const round = sanitizeAvatarConfig(def);
      expect(round).not.toBeNull();
      expect(round?.preset).toBe(def.preset);
    }
  });
});
