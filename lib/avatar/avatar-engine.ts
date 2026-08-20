// 1011 avatar adapter — Phase 6.2 (two-character curated model).
//
// Historical name: "dapvatar-adapter". Kept to avoid churning every
// import site during Phase 6.2. The engine tag on persisted configs
// ("engine":"dapvatar") is preserved for the same reason — it describes
// the provenance/rendering format of stored data. See lib/avatar/manifest.ts
// for the actual curated set (Karim White + Kulthum White + 29 expressions).

import {
  AVATAR_ASSET_BASE,
  AVATAR_CHARACTER_BY_ID,
  KARIM,
  KULTHUM,
  REACTION_POSTURE_KEYS,
  characterForGender,
} from "./manifest";

// Re-export for existing call sites.
export { AVATAR_ASSET_BASE } from "./manifest";

export type DapvatarCharacterId =
  | "male-karim-white"
  | "female-kulthum-white";
export type DapvatarPostureId = string;

/** Product default posture ids — the ONLY two humans in 1011 Tracker. */
export const DEFAULT_MALE_CHARACTER_ID = KARIM.id;
export const DEFAULT_MALE_POSTURE_ID = KARIM.defaultPostureId;
export const DEFAULT_FEMALE_CHARACTER_ID = KULTHUM.id;
export const DEFAULT_FEMALE_POSTURE_ID = KULTHUM.defaultPostureId;

// ---------------------------------------------------------------------------
// Runtime URL derivation — no catalog import needed
// ---------------------------------------------------------------------------

export function avatarAssetUrlFromPostureId(
  postureId: DapvatarPostureId | string | null | undefined,
): string | null {
  if (!postureId) return null;
  const m = /^(.+)-(\d+)-([a-z][a-z-]*)$/i.exec(postureId);
  if (!m) return null;
  const [, characterId, num, key] = m;
  if (!AVATAR_CHARACTER_BY_ID[characterId]) return null;
  const pad = num.padStart(2, "0");
  return `${AVATAR_ASSET_BASE}/${characterId}/${pad}-${key}.png`;
}

export function avatarPreviewAssetUrl(characterId: string): string | null {
  if (!AVATAR_CHARACTER_BY_ID[characterId]) return null;
  return `${AVATAR_ASSET_BASE}/${characterId}/01-happy.png`;
}

export function avatarAssetUrl(
  characterId: string,
  postureNumber: number,
  postureKey: string,
): string | null {
  if (!AVATAR_CHARACTER_BY_ID[characterId]) return null;
  const pad = String(postureNumber).padStart(2, "0");
  return `${AVATAR_ASSET_BASE}/${characterId}/${pad}-${postureKey}.png`;
}

export function characterIdFromPostureId(
  postureId: string | null | undefined,
): string | null {
  if (!postureId) return null;
  const m = /^(.+)-\d+-[a-z][a-z-]*$/i.exec(postureId);
  return m ? m[1] : null;
}

export function postureKeyFromPostureId(
  postureId: string | null | undefined,
): string | null {
  if (!postureId) return null;
  const m = /^.+-\d+-([a-z][a-z-]*)$/i.exec(postureId);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Reaction lookup — manifest-driven
// ---------------------------------------------------------------------------

/**
 * Resolve a reaction posture id for a character. Returns null if the
 * character doesn't exist in the curated set or doesn't have the
 * requested expression.
 */
export function reactionPostureIdFor(
  characterId: string,
  postureKey: string,
): string | null {
  const char = AVATAR_CHARACTER_BY_ID[characterId];
  if (!char) return null;
  const posture = char.expressions.find((e) => e.key === postureKey);
  return posture ? posture.postureId : null;
}

/**
 * Milestone-reaction posture keys used by celebration. Both curated
 * characters support all four so celebrations always resolve.
 */
export const REACTION_POSTURE_KEYS_BY_MILESTONE = REACTION_POSTURE_KEYS;

// ---------------------------------------------------------------------------
// Label helper — thin re-export so existing callers keep working.
// ---------------------------------------------------------------------------

export { humanLabelFor as postureLabel } from "./manifest";

// ---------------------------------------------------------------------------
// Product API — keep old name for import-site compatibility.
// ---------------------------------------------------------------------------

export { characterForGender };
