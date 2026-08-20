import { describe, expect, it } from "vitest";
import {
  DEFAULT_APPEARANCE,
  parseAppearance,
  serializeAppearance,
} from "./types";

describe("appearance types", () => {
  it("defaults are Original + Standard + System", () => {
    expect(DEFAULT_APPEARANCE).toEqual({
      colorTheme: "original",
      uiStyle: "standard",
      colorMode: "system",
    });
  });

  it("serialize + parse round-trips every valid combination", () => {
    for (const ct of ["original", "ruby", "emerald", "violet", "sunset"] as const) {
      for (const us of ["standard", "clay"] as const) {
        for (const cm of ["system", "light", "dark"] as const) {
          const a = { colorTheme: ct, uiStyle: us, colorMode: cm };
          expect(parseAppearance(serializeAppearance(a))).toEqual(a);
        }
      }
    }
  });

  it("empty / missing cookie yields default", () => {
    expect(parseAppearance(undefined)).toEqual(DEFAULT_APPEARANCE);
    expect(parseAppearance(null)).toEqual(DEFAULT_APPEARANCE);
    expect(parseAppearance("")).toEqual(DEFAULT_APPEARANCE);
  });

  it("garbage cookie values fall back per-field to defaults", () => {
    const parsed = parseAppearance("hackerman|neumorphism|blackhole");
    expect(parsed).toEqual(DEFAULT_APPEARANCE);
  });

  it("half-valid cookie keeps the valid fields", () => {
    const parsed = parseAppearance("emerald|standard|dark");
    expect(parsed.colorTheme).toBe("emerald");
    expect(parsed.uiStyle).toBe("standard");
    expect(parsed.colorMode).toBe("dark");

    const partial = parseAppearance("violet|clay|nope");
    expect(partial.colorTheme).toBe("violet");
    expect(partial.uiStyle).toBe("clay");
    expect(partial.colorMode).toBe(DEFAULT_APPEARANCE.colorMode);
  });

  it("three dimensions are independent — changing one does not touch the others", () => {
    const before = { colorTheme: "ruby", uiStyle: "clay", colorMode: "dark" } as const;
    const encoded = serializeAppearance({ ...before, colorTheme: "sunset" });
    const after = parseAppearance(encoded);
    expect(after.colorTheme).toBe("sunset");
    expect(after.uiStyle).toBe("clay");
    expect(after.colorMode).toBe("dark");
  });
});
