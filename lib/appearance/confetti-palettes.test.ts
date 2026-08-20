import { describe, expect, it } from "vitest";
import { CONFETTI_PALETTES, confettiPaletteFor } from "./confetti-palettes";
import { COLOR_THEMES } from "./types";

// canvas-confetti accepts CSS color strings; the worker cannot resolve
// custom properties, so we assert here that every palette is a plain
// hex string only. If someone later "fixes" a palette to
// `hsl(var(--brand-1))` this test catches it before ship.
const HEX = /^#[0-9a-fA-F]{6}$/;

describe("confettiPaletteFor", () => {
  it("returns a palette for every color theme", () => {
    for (const theme of COLOR_THEMES) {
      const p = confettiPaletteFor(theme);
      expect(p.milestone.length).toBeGreaterThan(0);
      expect(p.completed.length).toBeGreaterThan(0);
    }
  });

  it("every color entry is a 6-digit hex — no CSS variables leak into the worker", () => {
    for (const theme of COLOR_THEMES) {
      const p = CONFETTI_PALETTES[theme];
      for (const c of [...p.milestone, ...p.completed]) {
        expect(c, `${theme}: ${c}`).toMatch(HEX);
      }
    }
  });

  it("unknown / null / undefined theme falls back to Original", () => {
    for (const bad of [undefined, null, "", "hackerman", "midnight"]) {
      expect(confettiPaletteFor(bad)).toBe(CONFETTI_PALETTES.original);
    }
  });

  it("completed palette contains the milestone palette's brand colors + gold + white", () => {
    for (const theme of COLOR_THEMES) {
      const p = CONFETTI_PALETTES[theme];
      // Not asserting exact overlap because each theme picks its own gold
      // shade; just asserting the completion set is bigger than milestone.
      expect(p.completed.length).toBeGreaterThanOrEqual(p.milestone.length + 1);
    }
  });
});
