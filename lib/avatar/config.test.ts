import { describe, expect, it } from "vitest";
import {
  defaultAvatarFor,
  getPreset,
  presetsForGender,
  sanitizeAvatarConfig,
} from "./config";

describe("avatar preset registry", () => {
  it("returns male presets that all carry a kufi", () => {
    const list = presetsForGender("male");
    expect(list.length).toBeGreaterThan(0);
    for (const p of list) {
      expect(p.headwear).toBe("kufi");
      expect(p.gender).toBe("male");
    }
  });

  it("returns female presets that all carry a hijab", () => {
    const list = presetsForGender("female");
    expect(list.length).toBeGreaterThan(0);
    for (const p of list) {
      expect(p.headwear).toBe("hijab");
      expect(p.gender).toBe("female");
    }
  });

  it("neutral preset carries no headwear", () => {
    const list = presetsForGender("prefer_not_to_say");
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].headwear).toBe("none");
  });
});

describe("defaultAvatarFor — deterministic gender-appropriate defaults", () => {
  it("male → kufi", () => {
    const c = defaultAvatarFor("male");
    expect(getPreset(c.preset)?.headwear).toBe("kufi");
  });
  it("female → hijab", () => {
    const c = defaultAvatarFor("female");
    expect(getPreset(c.preset)?.headwear).toBe("hijab");
  });
  it("prefer_not_to_say → neutral (no headwear)", () => {
    const c = defaultAvatarFor("prefer_not_to_say");
    expect(getPreset(c.preset)?.headwear).toBe("none");
  });
  it("same gender produces the same default (deterministic)", () => {
    expect(defaultAvatarFor("male")).toEqual(defaultAvatarFor("male"));
  });
});

describe("sanitizeAvatarConfig — server-side whitelist (§71, §73)", () => {
  it("rejects null / non-object", () => {
    expect(sanitizeAvatarConfig(null)).toBeNull();
    expect(sanitizeAvatarConfig("male-01")).toBeNull();
    expect(sanitizeAvatarConfig(42)).toBeNull();
  });

  it("rejects unknown preset id", () => {
    expect(sanitizeAvatarConfig({ preset: "hackerman" })).toBeNull();
  });

  it("falls back to preset defaults for unknown skin/background ids", () => {
    const out = sanitizeAvatarConfig({
      preset: "male-01",
      skinTone: "definitely-not-real",
      background: "also-fake",
    });
    expect(out).not.toBeNull();
    expect(out?.skinTone).toBe("s2"); // male-01 default
    expect(out?.background).toBe("b1"); // male-01 default
  });

  it("locks headwear to the preset's declared headwear (never overridden)", () => {
    const out = sanitizeAvatarConfig({
      preset: "female-01",
      headwear: "kufi", // attempted client-side override
    });
    expect(out?.headwear).toBe("hijab");
  });

  it("silently drops any extra keys — SVG safety (§73)", () => {
    const out = sanitizeAvatarConfig({
      preset: "male-01",
      malicious: "<script>alert(1)</script>",
      innerHTML: "bad",
    });
    expect(out).not.toBeNull();
    expect(out).not.toHaveProperty("malicious");
    expect(out).not.toHaveProperty("innerHTML");
  });
});
