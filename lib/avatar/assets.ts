/**
 * Premium 3D avatar asset registry.
 *
 * WHY THIS FILE EXISTS
 * ----------------------------------------------------------------
 * The 4C.2B pass upgraded SVG artwork, but the actual product requirement
 * is premium pre-rendered 3D avatar renders. This file is the boundary
 * where those renders drop in. Everything else (config schema, `preset` id,
 * database rows) is untouched — a designer/generator produces the WebP set
 * matching the manifest below, sets each entry's `available: true`, and the
 * `<TasbihAvatar>` component switches to the rendered asset with no code
 * changes anywhere else.
 *
 * WHY NOT AUTO-DETECT ON THE CLIENT
 * ----------------------------------------------------------------
 * A brute-force `<Image onError>` fall-back would cause every avatar to
 * try loading a non-existent asset, produce a 404 in the console, then
 * fall back — a visible flash + noisy devtools. Instead we keep an
 * explicit manifest: the runtime knows which presets have real assets
 * before it renders and never attempts the load otherwise. The manifest
 * is short and mechanically regenerable via `scripts/scan-avatar-assets.mjs`.
 */
import { PRESETS } from "./config";

export const AVATAR_ASSET_BASE = "/avatars/v2" as const;

/**
 * Absolute public path to the rendered asset for a given preset id.
 * The naming scheme is intentionally simple: one hero render per preset,
 * using the preset's default skin + outfit tones. User customizations
 * (skin/outfit tweaks in Edit Profile) fall back to the SVG renderer for
 * v1 — customized 3D renders require per-variant assets, out of scope
 * until we have the base 3D set shipping first.
 */
export function assetPathFor(presetId: string): string {
  return `${AVATAR_ASSET_BASE}/${presetId}.webp`;
}

/**
 * Registry of preset ids for which a premium 3D asset actually exists on
 * disk. Populated by `scripts/scan-avatar-assets.mjs`, which walks
 * `public/avatars/v2/` and emits the current state. Every entry here MUST
 * correspond to a real file at `${AVATAR_ASSET_BASE}/${key}.webp`.
 *
 * Currently EMPTY — no premium 3D renders have shipped yet. Every avatar
 * therefore renders via the SVG fallback. See AVATAR_MANIFEST.md.
 */
export const AVATAR_ASSETS_AVAILABLE: Readonly<Record<string, true>> = Object.freeze({
  // (no premium 3D assets present)
});

export function hasPremiumAsset(presetId: string): boolean {
  return AVATAR_ASSETS_AVAILABLE[presetId] === true;
}

/**
 * List of every preset id we would expect an asset for, ordered as the
 * picker displays them. Used by the manifest generator + tests.
 */
export const EXPECTED_ASSET_PRESET_IDS: readonly string[] = PRESETS.map((p) => p.id);
