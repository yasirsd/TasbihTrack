// Concrete-hex confetti palettes per color theme.
//
// canvas-confetti's `colors` option requires CSS color strings that its
// worker can parse WITHOUT the DOM (it runs in an OffscreenCanvas /
// worker). Passing `hsl(var(--brand-1))` or any custom-property reference
// would be resolved against no cascade, producing black particles.
// Concrete hex values sidestep that entirely.
//
// The visual DIALOG surface behind the confetti keeps using CSS variables
// — that's fine, it renders in the main document.
//
// Each palette is the theme's brand-1, brand-1 soft, and brand-gold (with
// a warm white for the completion burst). Kept in lockstep with the
// tokens in `app/globals.css` — if a token there changes, update the
// matching hex here.

import type { ColorTheme } from "./types";

export interface ConfettiPalette {
  /** Colors used for milestone bursts (25/50/75). */
  milestone: string[];
  /** Colors used for the triple-burst completion celebration. */
  completed: string[];
}

/** Warm off-white used across every completion burst. */
const WHITE = "#FFFAF0";

// The hex values are picked to sit near the middle of each theme's brand
// palette, saturated enough to read as confetti against both light and
// dark surfaces. Each palette has been visually checked for contrast in
// light + dark (subject to owner real-device sign-off per §T).
export const CONFETTI_PALETTES: Record<ColorTheme, ConfettiPalette> = {
  original: {
    milestone: ["#EF233C", "#F45A6E", "#FDC500"],
    completed: ["#FDC500", "#FFD84A", "#EF233C", "#F45A6E", WHITE],
  },
  ruby: {
    milestone: ["#D91E62", "#F06292", "#F17A55"],
    completed: ["#F17A55", "#F8B08A", "#D91E62", "#F06292", WHITE],
  },
  emerald: {
    milestone: ["#0E9C6E", "#4BC28B", "#E7B940"],
    completed: ["#E7B940", "#F0D275", "#0E9C6E", "#4BC28B", WHITE],
  },
  violet: {
    milestone: ["#7C3AED", "#A78BFA", "#EAB040"],
    completed: ["#EAB040", "#F0CD70", "#7C3AED", "#A78BFA", WHITE],
  },
  sunset: {
    milestone: ["#F26A20", "#F49366", "#FDC000"],
    completed: ["#FDC000", "#FFD84A", "#F26A20", "#F49366", WHITE],
  },
};

/** Never throws; unknown theme falls back to Original. */
export function confettiPaletteFor(theme: string | null | undefined): ConfettiPalette {
  if (theme && theme in CONFETTI_PALETTES) {
    return CONFETTI_PALETTES[theme as ColorTheme];
  }
  return CONFETTI_PALETTES.original;
}
