// v3-only avatar config entry point.
//
// PHASE 6.1: this file previously held the v1/v2 SVG preset registry.
// That system has been retired. The single sanitizer exported here now
// accepts ONLY v3 (Dapvatar) shapes, delegating to sanitizeAvatarConfigV3
// which enforces both shape guards AND the authoritative catalog check.
//
// A separate helper (`isLegacyPresetConfig`) lets migration code detect
// old v1/v2 blobs without importing any old rendering logic — legacy
// artwork is never rendered again.

import type { AvatarConfig, Gender } from "@/lib/data/types";
import { defaultV3ForGender, sanitizeAvatarConfigV3 } from "./config-v3";

/**
 * Sanitize an avatar config from the wire. Accepts v3 only. Any other
 * shape (old v1/v2 SVG preset, garbage, null) → null. Never throws.
 */
export function sanitizeAvatarConfig(raw: unknown): AvatarConfig | null {
  return sanitizeAvatarConfigV3(raw);
}

/**
 * Deterministic default avatar for a given gender. Female/male return
 * verified v3 configs; anyone else returns null so the renderer draws
 * the 1011 BrandMark.
 */
export function defaultAvatarFor(gender: Gender): AvatarConfig | null {
  return defaultV3ForGender(gender);
}
