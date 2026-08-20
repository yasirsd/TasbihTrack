"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand/logo";
import type { AvatarConfig } from "@/lib/data/types";
import { isV3Config } from "@/lib/avatar/config-v3";
import {
  AVATAR_ASSET_BASE,
  postureKeyFromPostureId,
  reactionPostureIdFor,
} from "@/lib/avatar/avatar-engine";

/**
 * The single component every non-editor place in the app uses to display
 * a user's avatar.
 *
 * PHASE 6.1 — Dapvatar only:
 *   • Valid v3 (Dapvatar) config → render a versioned <img>.
 *   • Anything else (null, unrecognised, legacy v1/v2 blob that
 *     somehow reaches the client, image 404) → 1011 BrandMark.
 *
 * The old SVG "TasbihAvatar" renderer has been deleted. There is no
 * fallback path that draws pre-Phase-6 artwork.
 *
 * `expressionOverride` is a DISPLAY-ONLY prop used by milestone
 * celebrations. It never mutates the stored config. The override
 * posture is resolved through the generated Dapvatar manifest — if the
 * character doesn't support the requested key, we fall back to the
 * stored posture so the render always succeeds.
 */
export interface UserAvatarProps {
  config?: AvatarConfig | null;
  /** v3 only — swap the expression for this render pass only. */
  expressionOverride?: string;
  size?: number;
  alt?: string;
  ariaHidden?: boolean;
  className?: string;
  /** Loading strategy hint. Above-the-fold defaults should pass "eager". */
  loading?: "lazy" | "eager";
}

export function UserAvatar({
  config,
  expressionOverride,
  size = 96,
  alt,
  ariaHidden,
  className,
  loading,
}: UserAvatarProps) {
  if (isV3Config(config)) {
    return (
      <DapvatarImage
        characterId={config.characterId}
        postureId={config.postureId}
        expressionOverride={expressionOverride}
        size={size}
        alt={alt}
        ariaHidden={ariaHidden}
        className={className}
        loading={loading}
      />
    );
  }
  return (
    <BrandMark
      size={size}
      tone="gradient"
      title={alt ?? "1011"}
      className={className}
    />
  );
}

// ---------------------------------------------------------------------------
// v3 image renderer
// ---------------------------------------------------------------------------

function DapvatarImage({
  characterId,
  postureId,
  expressionOverride,
  size,
  alt,
  ariaHidden,
  className,
  loading,
}: {
  characterId: string;
  postureId: string;
  expressionOverride?: string;
  size: number;
  alt?: string;
  ariaHidden?: boolean;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  const [failed, setFailed] = React.useState(false);

  const url = React.useMemo(() => {
    // If the caller asked for a specific expression override, resolve
    // it through the generated manifest. Falls back to the stored
    // posture if the character doesn't support the requested key.
    if (expressionOverride) {
      const overrideId = reactionPostureIdFor(characterId, expressionOverride);
      if (overrideId) {
        return derive(overrideId);
      }
    }
    return derive(postureId);
  }, [characterId, postureId, expressionOverride]);

  if (failed) {
    return (
      <BrandMark size={size} tone="gradient" title={alt ?? "1011"} className={className} />
    );
  }
  return (
    <img
      src={url}
      alt={ariaHidden ? "" : alt ?? ""}
      aria-hidden={ariaHidden || !alt}
      width={size}
      height={size}
      loading={loading ?? "lazy"}
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
      className={cn("select-none", className)}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}

function derive(postureId: string): string {
  const key = postureKeyFromPostureId(postureId) ?? "happy";
  const num = /-(\d+)-[a-z][a-z-]*$/i.exec(postureId);
  const n = num ? Number(num[1]) : 1;
  const characterId = postureId.replace(/-\d+-[a-z][a-z-]*$/i, "");
  return `${AVATAR_ASSET_BASE}/${characterId}/${String(n).padStart(2, "0")}-${key}.png`;
}
