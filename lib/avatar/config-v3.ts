// v3 avatar config validation — Phase 6.2 curated allowlist.
//
// The valid character IDs are exactly TWO:
//   • male-karim-white
//   • female-kulthum-white
// Any other historical dapvatar character (Justin, Ariana, Karim-black,
// Kulthum-black, and 51 others) is rejected here. Server validation
// consults the tiny lib/avatar/manifest.ts.

import type { AvatarConfigV3, Gender } from "@/lib/data/types";
import {
  AVATAR_CHARACTER_BY_ID,
  KARIM,
  KULTHUM,
} from "./manifest";

// ---------------------------------------------------------------------------
// Shape guards
// ---------------------------------------------------------------------------

const CHARACTER_ID_RE = /^(female|male)-[a-z][a-z0-9-]*-(black|white)$/;
const POSTURE_ID_RE =
  /^(female|male)-[a-z][a-z0-9-]*-(black|white)-(\d{1,2})-([a-z][a-z-]*)$/;
const MAX_ID_LEN = 80;

function isKnownV3Shape(raw: unknown): raw is AvatarConfigV3 {
  if (!raw || typeof raw !== "object") return false;
  const src = raw as Record<string, unknown>;
  if (src.version !== 3) return false;
  if (src.engine !== "dapvatar") return false;
  if (typeof src.characterId !== "string" || src.characterId.length > MAX_ID_LEN) return false;
  if (typeof src.postureId !== "string" || src.postureId.length > MAX_ID_LEN) return false;
  if (!CHARACTER_ID_RE.test(src.characterId)) return false;
  if (!POSTURE_ID_RE.test(src.postureId)) return false;
  // Posture id must belong to the character id (cross-owner mixups rejected).
  const characterFromPosture = src.postureId.replace(/-\d+-[a-z][a-z-]*$/i, "");
  if (characterFromPosture !== src.characterId) return false;
  return true;
}

/** Authoritative check against the tiny 1011 curated manifest. */
function existsInCurated(characterId: string, postureId: string): boolean {
  const char = AVATAR_CHARACTER_BY_ID[characterId];
  if (!char) return false;
  return char.expressions.some((e) => e.postureId === postureId);
}

/**
 * Sanitize + validate a v3 config. Accepts ONLY the two curated
 * characters + their real postures. Never throws.
 */
export function sanitizeAvatarConfigV3(raw: unknown): AvatarConfigV3 | null {
  if (!isKnownV3Shape(raw)) return null;
  if (!existsInCurated(raw.characterId, raw.postureId)) return null;
  return {
    version: 3,
    engine: "dapvatar",
    characterId: raw.characterId,
    postureId: raw.postureId,
  };
}

/**
 * Gender-scoped variant used by updateProfileAction. A male profile can
 * only persist Karim; a female profile can only persist Kulthum. Neutral
 * profiles cannot persist any human avatar (returns null).
 */
export function sanitizeAvatarConfigV3ForGender(
  raw: unknown,
  gender: Gender | null | undefined,
): AvatarConfigV3 | null {
  const generic = sanitizeAvatarConfigV3(raw);
  if (!generic) return null;
  if (gender === "male" && generic.characterId !== KARIM.id) return null;
  if (gender === "female" && generic.characterId !== KULTHUM.id) return null;
  if (gender !== "male" && gender !== "female") return null;
  return generic;
}

// ---------------------------------------------------------------------------
// Defaults + gender-transition helpers
// ---------------------------------------------------------------------------

const FEMALE_DEFAULT: AvatarConfigV3 = {
  version: 3,
  engine: "dapvatar",
  characterId: KULTHUM.id,
  postureId: KULTHUM.defaultPostureId,
};

const MALE_DEFAULT: AvatarConfigV3 = {
  version: 3,
  engine: "dapvatar",
  characterId: KARIM.id,
  postureId: KARIM.defaultPostureId,
};

export function defaultV3ForGender(
  gender: Gender | null | undefined,
): AvatarConfigV3 | null {
  if (gender === "female") return FEMALE_DEFAULT;
  if (gender === "male") return MALE_DEFAULT;
  return null;
}

/**
 * Compute what the persisted avatar should become when a user's gender
 * changes. Rules from PROMPT 6.2 §"Gender change behavior":
 *
 *   • Male → Female: keep the same expression on Kulthum if it exists,
 *     else Kulthum's Heart Eyes.
 *   • Female → Male: keep the same expression on Karim if it exists,
 *     else Karim's Happy.
 *   • Male/Female → Neutral: null (BrandMark).
 *   • Neutral → Male: Karim + Happy.
 *   • Neutral → Female: Kulthum + Heart Eyes.
 *   • Same gender: caller supplies a new config; this function is not
 *     used.
 *
 * The current expression is extracted from the persisted avatar (v3
 * only — a legacy blob would already have been rewritten by migration
 * 0003/0004).
 */
export function avatarForGenderTransition(
  fromGender: Gender | null | undefined,
  toGender: Gender | null | undefined,
  currentAvatar: AvatarConfigV3 | null,
): AvatarConfigV3 | null {
  if (toGender === "prefer_not_to_say" || toGender === null || toGender === undefined) {
    return null;
  }
  const targetChar = toGender === "male" ? KARIM : KULTHUM;
  const currentKey = currentAvatar
    ? currentAvatar.postureId.replace(/^.+-\d+-/, "")
    : null;
  const preserved = currentKey
    ? targetChar.expressions.find((e) => e.key === currentKey)
    : null;
  const postureId = preserved
    ? preserved.postureId
    : targetChar.defaultPostureId;
  return {
    version: 3,
    engine: "dapvatar",
    characterId: targetChar.id,
    postureId,
  };
}

// ---------------------------------------------------------------------------
// Type detection helpers
// ---------------------------------------------------------------------------

export function isV3Config(c: unknown): c is AvatarConfigV3 {
  return isKnownV3Shape(c) && existsInCurated(c.characterId, c.postureId);
}

/** Detects an OLD v1/v2 preset shape for migration/import purposes only. */
export function isLegacyPresetConfig(c: unknown): boolean {
  if (!c || typeof c !== "object") return false;
  const src = c as Record<string, unknown>;
  return typeof src.preset === "string" && src.version !== 3;
}
