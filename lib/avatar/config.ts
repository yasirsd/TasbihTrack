import type { AvatarConfig, Gender } from "@/lib/data/types";

/**
 * Curated Tasbih Avatar preset system.
 *
 * We deliberately do NOT use a third-party avatar API — every render is a
 * pure function of the (whitelisted) config, produced by our own SVG code
 * on the server. This means:
 *   • no network call per render,
 *   • no user identifier leaked to a third party,
 *   • deterministic output across devices.
 *
 * Presets are grouped by gender: male presets ship with a kufi (prayer cap),
 * female presets ship with a hijab (headscarf), and the neutral preset uses
 * the 1011 mark itself when no gender preference is expressed. Users can
 * customize skin tone and background within their preset; headwear stays
 * consistent with the preset's cultural framing (a female preset never
 * swaps hijab for a kufi and vice-versa, per §47).
 */

export const SKIN_TONES = {
  s1: "#f3d5b5", // light
  s2: "#e0b088", // fair
  s3: "#c98a68", // medium
  s4: "#8f5d3f", // brown
  s5: "#5b3826", // deep
} as const;
export type SkinToneId = keyof typeof SKIN_TONES;

export const BACKGROUNDS = {
  b1: "#0F0F12", // ink
  b2: "#111827", // slate
  b3: "#3A2418", // umber
  b4: "#1E3A2F", // forest
  b5: "#3B1B26", // wine
  b6: "#4A3A0F", // olive-gold
} as const;
export type BackgroundId = keyof typeof BACKGROUNDS;

export interface PresetDefinition {
  id: string;
  gender: Gender;
  /** Which headwear this preset was designed with — never overridden. */
  headwear: "kufi" | "hijab" | "none";
  /** Default skin tone id (may be edited by the user). */
  defaultSkin: SkinToneId;
  /** Default background id (may be edited by the user). */
  defaultBackground: BackgroundId;
}

export const PRESETS: readonly PresetDefinition[] = [
  { id: "male-01", gender: "male", headwear: "kufi", defaultSkin: "s2", defaultBackground: "b1" },
  { id: "male-02", gender: "male", headwear: "kufi", defaultSkin: "s3", defaultBackground: "b4" },
  { id: "male-03", gender: "male", headwear: "kufi", defaultSkin: "s4", defaultBackground: "b6" },
  { id: "female-01", gender: "female", headwear: "hijab", defaultSkin: "s1", defaultBackground: "b1" },
  { id: "female-02", gender: "female", headwear: "hijab", defaultSkin: "s2", defaultBackground: "b3" },
  { id: "female-03", gender: "female", headwear: "hijab", defaultSkin: "s3", defaultBackground: "b5" },
  {
    id: "neutral-01",
    gender: "prefer_not_to_say",
    headwear: "none",
    defaultSkin: "s1",
    defaultBackground: "b1",
  },
];

const PRESET_INDEX: Record<string, PresetDefinition> = Object.fromEntries(
  PRESETS.map((p) => [p.id, p]),
);

export function getPreset(id: string): PresetDefinition | null {
  return PRESET_INDEX[id] ?? null;
}

export function presetsForGender(gender: Gender): PresetDefinition[] {
  return PRESETS.filter((p) => p.gender === gender);
}

export function defaultAvatarFor(gender: Gender): AvatarConfig {
  const first = presetsForGender(gender)[0];
  const preset = first ?? PRESETS[PRESETS.length - 1];
  return {
    preset: preset.id,
    skinTone: preset.defaultSkin,
    background: preset.defaultBackground,
    headwear: preset.headwear,
  };
}

/**
 * Whitelist-validates a client-supplied config. Rejects unknown preset ids,
 * unknown skin/background ids, or mismatched headwear. Returns a fresh
 * normalized object (never mutates the input) or null if invalid.
 */
export function sanitizeAvatarConfig(raw: unknown): AvatarConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const src = raw as Record<string, unknown>;
  const presetId = typeof src.preset === "string" ? src.preset : "";
  const preset = getPreset(presetId);
  if (!preset) return null;

  const skinTone =
    typeof src.skinTone === "string" && (SKIN_TONES as Record<string, string>)[src.skinTone]
      ? (src.skinTone as SkinToneId)
      : preset.defaultSkin;
  const background =
    typeof src.background === "string" && (BACKGROUNDS as Record<string, string>)[src.background]
      ? (src.background as BackgroundId)
      : preset.defaultBackground;
  // Headwear stays locked to the preset's original headwear (see §47).
  return {
    preset: preset.id,
    skinTone,
    background,
    headwear: preset.headwear,
  };
}
