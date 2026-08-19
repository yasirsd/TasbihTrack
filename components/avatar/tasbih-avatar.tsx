"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import {
  BACKGROUNDS,
  OUTFIT_TONES,
  SKIN_TONES,
  defaultAvatarFor,
  getPreset,
  sanitizeAvatarConfig,
  type BackgroundId,
  type OutfitToneId,
  type PresetDefinition,
  type SkinToneId,
} from "@/lib/avatar/config";
import { assetPathFor, hasPremiumAsset } from "@/lib/avatar/assets";
import type { AvatarConfig, Gender } from "@/lib/data/types";
import { BrandMark } from "@/components/brand/logo";

export interface TasbihAvatarProps {
  config?: AvatarConfig | null;
  gender?: Gender | null;
  alt?: string;
  ariaHidden?: boolean;
  size?: number;
  className?: string;
}

/**
 * TasbihAvatar — premium dimensional SVG portrait.
 *
 * VISUAL SYSTEM
 * -------------
 * Each avatar is composed of five lit layers rendered in a single SVG:
 *
 *   1. Background — soft radial to give the frame depth.
 *   2. Shoulders + outfit — a curved v-neck kurta/thobe silhouette with
 *      a subtle shade line to imply cloth thickness.
 *   3. Face + neck — dimensional oval with cheek highlight, jaw shadow
 *      and a soft nasal shadow that reads as volume without cartoon detail.
 *   4. Eyes + brows + calm smile — restrained geometry, never cartoony.
 *   5. Headwear — kufi (rounded skullcap with band + subtle brocade line),
 *      hijab (single continuous drape with fold shading), or the 1011
 *      brand monogram for the neutral preset.
 *
 * SVG SAFETY
 * ----------
 * The `config` is passed through the whitelist sanitizer before render.
 * Nothing here ever touches innerHTML / dangerouslySetInnerHTML — every
 * attribute value is either a whitelisted color id or a numeric literal.
 */
export function TasbihAvatar({
  config,
  gender,
  alt,
  ariaHidden,
  size = 48,
  className,
}: TasbihAvatarProps) {
  const resolved = React.useMemo<AvatarConfig>(() => {
    const sanitized = sanitizeAvatarConfig(config);
    if (sanitized) return sanitized;
    return defaultAvatarFor(gender ?? "prefer_not_to_say");
  }, [config, gender]);
  const preset = getPreset(resolved.preset)!;
  const skin = SKIN_TONES[(resolved.skinTone ?? preset.defaultSkin) as SkinToneId];
  const bg = BACKGROUNDS[(resolved.background ?? preset.defaultBackground) as BackgroundId];
  const outfit =
    OUTFIT_TONES[(resolved.outfitTone ?? preset.defaultOutfit) as OutfitToneId];
  const role = ariaHidden ? undefined : "img";
  const label = alt ?? preset.label;
  const gradIds = useUniqueIds();

  // ------------------------------------------------------------------------
  // Rendered-asset gate.
  //
  // We use the premium WebP render only when both:
  //   (a) the manifest reports an asset shipped for this preset, and
  //   (b) the user hasn't customized skin/outfit/background away from the
  //       preset's defaults (variant renders aren't in the base set).
  //
  // Otherwise the SVG renderer below runs. An <img> load failure — the asset
  // was reported present but the network 404s — falls through to SVG via
  // onError. If SVG somehow fails, the outer bail-out returns the 1011 mark.
  // ------------------------------------------------------------------------
  const isCustomized =
    resolved.skinTone !== preset.defaultSkin ||
    resolved.outfitTone !== preset.defaultOutfit ||
    resolved.background !== preset.defaultBackground;
  const assetEligible = !isCustomized && hasPremiumAsset(preset.id);
  const [assetFailed, setAssetFailed] = React.useState(false);

  if (assetEligible && !assetFailed) {
    return (
      <PremiumAssetAvatar
        presetId={preset.id}
        size={size}
        alt={label}
        ariaHidden={ariaHidden}
        className={className}
        onError={() => setAssetFailed(true)}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role={role}
      aria-label={ariaHidden ? undefined : label}
      aria-hidden={ariaHidden || undefined}
      className={cn("shrink-0 select-none", className)}
    >
      <defs>
        <radialGradient id={gradIds.bg} cx="0.5" cy="0.3" r="0.9">
          <stop offset="0%" stopColor={lighten(bg, 0.18)} />
          <stop offset="100%" stopColor={bg} />
        </radialGradient>
        <radialGradient id={gradIds.skin} cx="0.35" cy="0.35" r="0.9">
          <stop offset="0%" stopColor={lighten(skin, 0.12)} />
          <stop offset="60%" stopColor={skin} />
          <stop offset="100%" stopColor={darken(skin, 0.22)} />
        </radialGradient>
        <linearGradient id={gradIds.outfit} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lighten(outfit, 0.1)} />
          <stop offset="100%" stopColor={darken(outfit, 0.15)} />
        </linearGradient>
        {preset.headwear === "kufi" && (
          <linearGradient id={gradIds.kufi} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lighten(outfit, 0.15)} />
            <stop offset="70%" stopColor={outfit} />
            <stop offset="100%" stopColor={darken(outfit, 0.25)} />
          </linearGradient>
        )}
        {preset.headwear === "hijab" && (
          <linearGradient id={gradIds.hijab} x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor={lighten(outfit, 0.15)} />
            <stop offset="55%" stopColor={outfit} />
            <stop offset="100%" stopColor={darken(outfit, 0.35)} />
          </linearGradient>
        )}
      </defs>

      {/* Background */}
      <rect width="100" height="100" rx="22" fill={`url(#${gradIds.bg})`} />

      {/* Outfit / shoulders */}
      <Outfit outfitId={`url(#${gradIds.outfit})`} skinShadow={darken(skin, 0.25)} />

      {/* Face */}
      <Face skinFill={`url(#${gradIds.skin})`} skinShadow={darken(skin, 0.25)} />

      {/* Headwear */}
      {preset.headwear === "kufi" && <Kufi fillId={`url(#${gradIds.kufi})`} />}
      {preset.headwear === "hijab" && (
        <Hijab
          fillId={`url(#${gradIds.hijab})`}
          skinFill={`url(#${gradIds.skin})`}
        />
      )}
      {preset.headwear === "none" && <NeutralMark />}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Sub-parts
// ---------------------------------------------------------------------------

function Outfit({
  outfitId,
  skinShadow,
}: {
  outfitId: string;
  skinShadow: string;
}) {
  return (
    <g>
      {/* Neck — extends into the outfit */}
      <path
        d="M 42 76 L 42 82 L 58 82 L 58 76 Z"
        fill={skinShadow}
        opacity="0.85"
      />
      {/* Shoulders / kurta silhouette */}
      <path
        d="M 12 100 C 12 84, 30 78, 42 80 L 50 88 L 58 80 C 70 78, 88 84, 88 100 Z"
        fill={outfitId}
      />
      {/* V-neck accent line */}
      <path
        d="M 42 80 L 50 88 L 58 80"
        fill="none"
        stroke={skinShadow}
        strokeWidth="0.8"
        opacity="0.5"
      />
    </g>
  );
}

function Face({
  skinFill,
  skinShadow,
}: {
  skinFill: string;
  skinShadow: string;
}) {
  return (
    <g>
      {/* Head */}
      <ellipse cx="50" cy="50" rx="22" ry="24" fill={skinFill} />

      {/* Jaw shadow (right) — gives the face volume */}
      <path
        d="M 63 55 C 65 62, 62 70, 55 73 L 50 73 C 55 72, 60 66, 62 60 Z"
        fill={skinShadow}
        opacity="0.14"
      />

      {/* Cheek highlight (left) */}
      <ellipse cx="41" cy="56" rx="5" ry="3.5" fill="#FFFFFF" opacity="0.08" />

      {/* Nose shadow — soft T-shape */}
      <path
        d="M 50 51 C 48.5 55, 48 58, 49 60 L 51 60 C 52 58, 51.5 55, 50 51 Z"
        fill={skinShadow}
        opacity="0.13"
      />

      {/* Brows */}
      <path
        d="M 40 46 Q 43 44 46 46"
        stroke="#1c1c1e"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 54 46 Q 57 44 60 46"
        stroke="#1c1c1e"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Eyes */}
      <ellipse cx="43" cy="51" rx="1.6" ry="1.9" fill="#1c1c1e" />
      <ellipse cx="57" cy="51" rx="1.6" ry="1.9" fill="#1c1c1e" />
      {/* Eye catchlights — the single detail that reads as "premium" */}
      <circle cx="43.6" cy="50.4" r="0.5" fill="#FFFFFF" opacity="0.9" />
      <circle cx="57.6" cy="50.4" r="0.5" fill="#FFFFFF" opacity="0.9" />

      {/* Calm smile */}
      <path
        d="M 43 63 Q 50 66 57 63"
        stroke="#1c1c1e"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
    </g>
  );
}

function Kufi({ fillId }: { fillId: string }) {
  return (
    <g>
      {/* Cap — cloth thickness suggested by a slight extra height on top */}
      <path
        d="M 28 34 C 28 22, 72 22, 72 34 L 72 38 L 28 38 Z"
        fill={fillId}
      />
      {/* Band — sits below the crown */}
      <rect x="27.5" y="36" width="45" height="4" fill="#00000022" />
      <rect x="27.5" y="36" width="45" height="4" fill={fillId} opacity="0.9" />
      {/* Subtle brocade line — one horizontal detail is enough */}
      <path
        d="M 32 32 L 68 32"
        stroke="#FFFFFF"
        strokeOpacity="0.18"
        strokeWidth="0.5"
        strokeDasharray="1 2"
      />
      {/* Highlight along the top edge */}
      <path
        d="M 32 25 C 42 22, 58 22, 68 25"
        stroke="#FFFFFF"
        strokeOpacity="0.35"
        strokeWidth="0.6"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}

function Hijab({
  fillId,
  skinFill,
}: {
  fillId: string;
  skinFill: string;
}) {
  return (
    <g>
      {/* Main drape — covers hair, frames face, drapes to shoulders */}
      <path
        d="M 20 55 C 18 30, 40 18, 50 18 C 60 18, 82 30, 80 55 C 88 64, 88 80, 80 82 L 74 76 C 74 70, 72 66, 70 62 L 30 62 C 28 66, 26 70, 26 76 L 20 82 C 12 80, 12 64, 20 55 Z"
        fill={fillId}
      />
      {/* Fold shadow along the left drape */}
      <path
        d="M 26 60 C 24 68, 24 74, 26 78"
        stroke="#00000030"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      />
      {/* Highlight along the crown */}
      <path
        d="M 34 24 C 42 20, 58 20, 66 24"
        stroke="#FFFFFF"
        strokeOpacity="0.28"
        strokeWidth="0.8"
        fill="none"
        strokeLinecap="round"
      />
      {/* Face opening — re-draw the face inside the drape frame */}
      <ellipse cx="50" cy="52" rx="17" ry="19" fill={skinFill} />
      {/* Restate brows/eyes/smile because they'd otherwise be occluded */}
      <path
        d="M 40 47 Q 43 45 46 47"
        stroke="#1c1c1e"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 54 47 Q 57 45 60 47"
        stroke="#1c1c1e"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      <ellipse cx="43" cy="52" rx="1.6" ry="1.9" fill="#1c1c1e" />
      <ellipse cx="57" cy="52" rx="1.6" ry="1.9" fill="#1c1c1e" />
      <circle cx="43.6" cy="51.4" r="0.5" fill="#FFFFFF" opacity="0.9" />
      <circle cx="57.6" cy="51.4" r="0.5" fill="#FFFFFF" opacity="0.9" />
      <path
        d="M 43 62 Q 50 65 57 62"
        stroke="#1c1c1e"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
    </g>
  );
}

function NeutralMark() {
  return (
    <g transform="translate(0,-2)">
      <text
        x="50"
        y="52"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontWeight="700"
        fontSize="22"
        fill="#F4F0E4"
        letterSpacing="1.5"
      >
        1011
      </text>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Color helpers — small, no dependency
// ---------------------------------------------------------------------------

function useUniqueIds() {
  const base = React.useId();
  return React.useMemo(
    () => ({
      bg: `${base}-bg`,
      skin: `${base}-skin`,
      outfit: `${base}-outfit`,
      kufi: `${base}-kufi`,
      hijab: `${base}-hijab`,
    }),
    [base],
  );
}

function lighten(hex: string, amount: number): string {
  return shift(hex, amount);
}
function darken(hex: string, amount: number): string {
  return shift(hex, -amount);
}
function shift(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = clamp(Math.round(rgb.r + (amount > 0 ? (255 - rgb.r) : rgb.r) * amount));
  const g = clamp(Math.round(rgb.g + (amount > 0 ? (255 - rgb.g) : rgb.g) * amount));
  const b = clamp(Math.round(rgb.b + (amount > 0 ? (255 - rgb.b) : rgb.b) * amount));
  return `rgb(${r},${g},${b})`;
}
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}
function clamp(n: number): number {
  return Math.max(0, Math.min(255, n));
}

// ---------------------------------------------------------------------------
// Premium 3D asset renderer
//
// Uses a plain <img> (not next/image) because:
//   • the file is a tiny WebP served straight from /public,
//   • we need reliable onError → SVG fallback without Next's optimization
//     layer intercepting the 404,
//   • sizes are fixed and known at the call site.
// ---------------------------------------------------------------------------

function PremiumAssetAvatar({
  presetId,
  size,
  alt,
  ariaHidden,
  className,
  onError,
}: {
  presetId: string;
  size: number;
  alt: string;
  ariaHidden?: boolean;
  className?: string;
  onError: () => void;
}) {
  const src = React.useMemo(() => assetPathFor(presetId), [presetId]);
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={ariaHidden ? "" : alt}
      aria-hidden={ariaHidden || undefined}
      draggable={false}
      decoding="async"
      loading="lazy"
      onError={onError}
      className={cn(
        "shrink-0 select-none rounded-[22px] object-cover",
        className,
      )}
    />
  );
}

/**
 * Last-resort brand fallback. Only reachable if SVG rendering itself failed
 * — kept for parity with §13 (never show broken-image UI, never fall back
 * to the old cheap SVG).
 *
 * Not currently referenced because the SVG path above always renders;
 * exposed for callers that want to force it (e.g. bulk-import error states).
 */
export function AvatarBrandFallback({
  size = 48,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <BrandMark
      size={size}
      tone="gradient"
      chip
      className={className}
      title="1011"
    />
  );
}

// Exposed for downstream consumers.
export type { PresetDefinition };
