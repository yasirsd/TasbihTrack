"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import {
  BACKGROUNDS,
  SKIN_TONES,
  defaultAvatarFor,
  getPreset,
  sanitizeAvatarConfig,
  type BackgroundId,
  type SkinToneId,
} from "@/lib/avatar/config";
import type { AvatarConfig, Gender } from "@/lib/data/types";

export interface TasbihAvatarProps {
  config?: AvatarConfig | null;
  /** Used as a fallback if no config is provided. */
  gender?: Gender | null;
  /** Alt text — omitted when decorative (aria-hidden then true). */
  alt?: string;
  ariaHidden?: boolean;
  size?: number;
  className?: string;
}

/**
 * Deterministic SVG avatar. No network calls, no third-party avatar API.
 * The visual is deliberately restrained and dignified — a simple character
 * face + culturally appropriate headwear + brand-palette background. The
 * headwear layers are drawn as flat geometry, not clip art.
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
  const role = ariaHidden ? undefined : "img";

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role={role}
      aria-label={ariaHidden ? undefined : alt ?? "Profile avatar"}
      aria-hidden={ariaHidden || undefined}
      className={cn("shrink-0 select-none", className)}
    >
      {/* Rounded-square background so the avatar composes with card corners */}
      <rect width="100" height="100" rx="22" fill={bg} />
      {/* Neck & shoulder */}
      <path d="M20 100 C 20 78, 40 74, 50 74 C 60 74, 80 78, 80 100 Z" fill={skin} opacity="0.9" />
      {/* Face */}
      <ellipse cx="50" cy="52" rx="22" ry="24" fill={skin} />
      {/* Simple restrained eyes + mouth — geometric, no cartoony detail */}
      <circle cx="43" cy="51" r="1.6" fill="#1c1c1e" />
      <circle cx="57" cy="51" r="1.6" fill="#1c1c1e" />
      <path
        d="M 44 62 Q 50 65 56 62"
        stroke="#1c1c1e"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      {/* Headwear */}
      {preset.headwear === "kufi" && <Kufi />}
      {preset.headwear === "hijab" && <Hijab skinColor={skin} />}
      {preset.headwear === "none" && <NeutralMark />}
    </svg>
  );
}

/**
 * Kufi — a compact rounded cap sitting on the crown. Deliberately simple
 * geometry (a chord above a decorative band) rather than an ornamented
 * illustration.
 */
function Kufi() {
  return (
    <g>
      <path
        d="M 27 34 C 27 24, 73 24, 73 34 L 73 38 L 27 38 Z"
        fill="#F4F0E4"
      />
      {/* Trim band */}
      <rect x="27" y="36" width="46" height="4" fill="#D8CFB6" />
    </g>
  );
}

/**
 * Hijab — a headscarf that covers the hair and drapes softly to the
 * shoulders. Uses a single continuous shape so the geometry stays clean at
 * small sizes.
 */
function Hijab({ skinColor }: { skinColor: string }) {
  return (
    <g>
      <path
        d="M 22 55 C 20 32, 40 20, 50 20 C 60 20, 80 32, 78 55 C 84 62, 84 74, 78 78 L 74 74 C 74 70, 72 66, 70 62 L 30 62 C 28 66, 26 70, 26 74 L 22 78 C 16 74, 16 62, 22 55 Z"
        fill="#0C4A6E"
      />
      {/* Face oval showing through the hijab opening */}
      <ellipse cx="50" cy="52" rx="18" ry="20" fill={skinColor} />
      {/* Restated eyes/mouth because the hijab overlaps them */}
      <circle cx="43" cy="51" r="1.6" fill="#1c1c1e" />
      <circle cx="57" cy="51" r="1.6" fill="#1c1c1e" />
      <path
        d="M 44 62 Q 50 65 56 62"
        stroke="#1c1c1e"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
    </g>
  );
}

/**
 * Neutral mark — used when gender is prefer_not_to_say. We overlay the
 * 1011 brand as the character's identity, so users are never assigned an
 * inferred visual gender they didn't choose.
 */
function NeutralMark() {
  return (
    <g transform="translate(0,-2)">
      <text
        x="50"
        y="46"
        textAnchor="middle"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontWeight="700"
        fontSize="20"
        fill="#F4F0E4"
        letterSpacing="1"
      >
        1011
      </text>
    </g>
  );
}
