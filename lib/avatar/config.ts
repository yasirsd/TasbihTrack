import type { AvatarConfig, Gender } from "@/lib/data/types";

/**
 * Avatar v2 config system.
 *
 * ARCHITECTURE — read this before touching anything else.
 * ================================================================
 * We store the config, never the rendered image. This lets us swap the
 * renderer (SVG today, real pre-rendered 3D PNG/WebP tomorrow) without a
 * data migration. Every field is a whitelisted enum id, never free-form
 * markup, so nothing user-supplied can ever reach the render pipeline
 * (§73 SVG safety).
 *
 * v1 → v2 mapping is deterministic and lossless: an old { preset:"male-01"
 * skinTone:"s2" background:"b1" } becomes the equivalent v2 record with
 * `version:2` on the next successful profile save. Existing v1 configs
 * keep working forever — see `sanitizeAvatarConfig` — so this is a soft
 * migration with no destructive DB step.
 *
 * When real 3D renders drop in, they replace the SVG in `TasbihAvatar`
 * only. Preset ids stay stable so the DB rows don't need touching.
 */

export const SKIN_TONES = {
  s1: "#f3d5b5", // light
  s2: "#e0b088", // light-medium
  s3: "#c98a68", // medium
  s4: "#8f5d3f", // medium-deep
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

/** Outfit tone palette — the shirt/kurta color behind the shoulders. */
export const OUTFIT_TONES = {
  o1: "#F4F0E4", // cream (the default kufi cream — reads warm)
  o2: "#0C4A6E", // deep navy
  o3: "#3B1B26", // wine
  o4: "#1E3A2F", // forest
  o5: "#0F0F12", // ink
  o6: "#7C3A3A", // brick
} as const;
export type OutfitToneId = keyof typeof OUTFIT_TONES;

export interface PresetDefinition {
  id: string;
  gender: Gender;
  /** Which headwear this preset was designed with — never overridden. */
  headwear: "kufi" | "hijab" | "none";
  defaultSkin: SkinToneId;
  defaultBackground: BackgroundId;
  defaultOutfit: OutfitToneId;
  /** Human-readable label — used for a11y and asset alt text. */
  label: string;
}

export const PRESETS: readonly PresetDefinition[] = [
  // MALE — kufi variants; premium 3D renders will drop into these slots.
  { id: "male-01", gender: "male", headwear: "kufi", defaultSkin: "s2", defaultBackground: "b1", defaultOutfit: "o1", label: "Male avatar with cream kufi" },
  { id: "male-02", gender: "male", headwear: "kufi", defaultSkin: "s3", defaultBackground: "b4", defaultOutfit: "o4", label: "Male avatar with forest kufi" },
  { id: "male-03", gender: "male", headwear: "kufi", defaultSkin: "s4", defaultBackground: "b6", defaultOutfit: "o6", label: "Male avatar with brick kufi" },
  { id: "male-04", gender: "male", headwear: "kufi", defaultSkin: "s1", defaultBackground: "b2", defaultOutfit: "o2", label: "Male avatar with navy kufi" },
  // FEMALE — hijab variants.
  { id: "female-01", gender: "female", headwear: "hijab", defaultSkin: "s1", defaultBackground: "b1", defaultOutfit: "o1", label: "Female avatar with cream hijab" },
  { id: "female-02", gender: "female", headwear: "hijab", defaultSkin: "s2", defaultBackground: "b3", defaultOutfit: "o3", label: "Female avatar with wine hijab" },
  { id: "female-03", gender: "female", headwear: "hijab", defaultSkin: "s3", defaultBackground: "b5", defaultOutfit: "o4", label: "Female avatar with forest hijab" },
  { id: "female-04", gender: "female", headwear: "hijab", defaultSkin: "s4", defaultBackground: "b2", defaultOutfit: "o2", label: "Female avatar with navy hijab" },
  // NEUTRAL — the 1011 monogram identity.
  { id: "neutral-01", gender: "prefer_not_to_say", headwear: "none", defaultSkin: "s1", defaultBackground: "b1", defaultOutfit: "o1", label: "Neutral 1011 avatar" },
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

/**
 * Returns the canonical default avatar config for a given gender.
 * Deterministic; used by both registration and legacy defaulting.
 */
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
 * v1 → v2 migration.
 *
 * v1 shipped { preset, skinTone, background, headwear } with no version
 * field. v2 keeps that shape and additionally recognizes:
 *
 *   - version (defaults to 2 when re-emitted)
 *   - outfitTone (falls back to the preset's default when missing)
 *
 * Legacy v1 configs continue to render correctly. When the sanitizer
 * accepts a v1 record it up-converts silently — the next profile save
 * writes the v2 form back.
 */
export function sanitizeAvatarConfig(raw: unknown): AvatarConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const src = raw as Record<string, unknown>;
  const presetId = typeof src.preset === "string" ? src.preset : "";
  const preset = getPreset(presetId);
  if (!preset) return null;

  const skinTone =
    typeof src.skinTone === "string" &&
    (SKIN_TONES as Record<string, string>)[src.skinTone]
      ? (src.skinTone as SkinToneId)
      : preset.defaultSkin;
  const background =
    typeof src.background === "string" &&
    (BACKGROUNDS as Record<string, string>)[src.background]
      ? (src.background as BackgroundId)
      : preset.defaultBackground;
  const outfitTone =
    typeof src.outfitTone === "string" &&
    (OUTFIT_TONES as Record<string, string>)[src.outfitTone]
      ? (src.outfitTone as OutfitToneId)
      : preset.defaultOutfit;

  return {
    preset: preset.id,
    skinTone,
    background,
    outfitTone,
    headwear: preset.headwear,
  };
}
