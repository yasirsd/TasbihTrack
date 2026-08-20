// Three independent presentation dimensions (see PROMPT 5B §26).
//
// Kept in its own module so the appearance provider, the pre-paint script,
// the cookie helper, and the persistence layer all import from ONE source.

export type ColorTheme =
  | "original"
  | "ruby"
  | "emerald"
  | "violet"
  | "sunset";

export type UIStyle = "standard" | "clay";

export type ColorMode = "system" | "light" | "dark";

export interface Appearance {
  colorTheme: ColorTheme;
  uiStyle: UIStyle;
  colorMode: ColorMode;
}

export const COLOR_THEMES: readonly ColorTheme[] = [
  "original",
  "ruby",
  "emerald",
  "violet",
  "sunset",
] as const;

export const UI_STYLES: readonly UIStyle[] = ["standard", "clay"] as const;

export const COLOR_MODES: readonly ColorMode[] = [
  "system",
  "light",
  "dark",
] as const;

export const DEFAULT_APPEARANCE: Appearance = {
  colorTheme: "original",
  uiStyle: "standard",
  colorMode: "system",
};

// A single cookie holds all three so we can read them synchronously in the
// root layout (server) and stamp `<html>` with the correct data attributes
// before the first paint — no FOAT flash. Chosen to be short + trivially
// parseable so the pre-paint inline script stays tiny.
export const APPEARANCE_COOKIE = "tt_appearance";

/** Serialise for the cookie. Compact, easy to parse in a 1-line script. */
export function serializeAppearance(a: Partial<Appearance>): string {
  const merged: Appearance = { ...DEFAULT_APPEARANCE, ...a };
  return `${merged.colorTheme}|${merged.uiStyle}|${merged.colorMode}`;
}

/** Best-effort parse; falls back per-field to defaults. Never throws. */
export function parseAppearance(raw: string | undefined | null): Appearance {
  if (!raw) return DEFAULT_APPEARANCE;
  const [ct, us, cm] = raw.split("|");
  const colorTheme = (COLOR_THEMES as readonly string[]).includes(ct)
    ? (ct as ColorTheme)
    : DEFAULT_APPEARANCE.colorTheme;
  const uiStyle = (UI_STYLES as readonly string[]).includes(us)
    ? (us as UIStyle)
    : DEFAULT_APPEARANCE.uiStyle;
  const colorMode = (COLOR_MODES as readonly string[]).includes(cm)
    ? (cm as ColorMode)
    : DEFAULT_APPEARANCE.colorMode;
  return { colorTheme, uiStyle, colorMode };
}

/**
 * Human-facing label for each color theme. Sole source of truth so the
 * settings screen and any test both read the same string.
 */
export const COLOR_THEME_LABEL: Record<ColorTheme, string> = {
  original: "Original",
  ruby: "Ruby Bloom",
  emerald: "Emerald Garden",
  violet: "Royal Violet",
  sunset: "Sunset",
};

export const COLOR_THEME_DESCRIPTION: Record<ColorTheme, string> = {
  original: "Crimson and gold — the 1011 brand.",
  ruby: "Deep ruby, warm pink, blush.",
  emerald: "Rich emerald, mint, sage.",
  violet: "Royal violet, lavender, plum.",
  sunset: "Coral, warm orange, sunny yellow.",
};
