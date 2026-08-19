# 1011 Tracker — Premium 3D Avatar Asset Manifest (v2)

This directory holds the premium pre-rendered avatar art referenced by
`lib/avatar/assets.ts`. When files matching the manifest below exist here,
the app switches from the SVG fallback to the rendered WebP. Run
`node scripts/scan-avatar-assets.mjs` to auto-populate the
`AVATAR_ASSETS_AVAILABLE` registry after adding files.

## Naming

Every file is a single WebP:

    /public/avatars/v2/<preset-id>.webp

Preset ids are stable — they are the same strings currently stored in the
`users.avatar_config->>'preset'` column. Existing accounts will bind to
these assets with no data migration.

## Required files

Each render must be:

- Square, 512 × 512 pixels
- Transparent background (the app supplies the surface)
- Head + shoulders composition
- Consistent camera position and lighting across the whole family
- WebP, target size ≤ 40 KB (AVIF acceptable if the client base supports it)
- Alt text mirrored from the `label` field in `lib/avatar/config.ts`

### Male — kufi presets

| File | Kufi color | Skin tone | Outfit tone | Alt |
| --- | --- | --- | --- | --- |
| `male-01.webp` | cream | light-medium | cream | Male avatar with cream kufi |
| `male-02.webp` | forest green | medium | forest green | Male avatar with forest kufi |
| `male-03.webp` | brick red | medium-deep | brick red | Male avatar with brick kufi |
| `male-04.webp` | deep navy | light | deep navy | Male avatar with navy kufi |

### Female — hijab presets

| File | Hijab color | Skin tone | Outfit tone | Alt |
| --- | --- | --- | --- | --- |
| `female-01.webp` | cream | light | cream | Female avatar with cream hijab |
| `female-02.webp` | wine | light-medium | wine | Female avatar with wine hijab |
| `female-03.webp` | forest green | medium | forest green | Female avatar with forest hijab |
| `female-04.webp` | deep navy | medium-deep | deep navy | Female avatar with navy hijab |

### Neutral

| File | Description |
| --- | --- |
| `neutral-01.webp` | 1011 monogram identity — no assigned gender presentation |

## Art direction

- Modern 3D emoji quality — dimensional cheeks / nose / eye highlights, soft studio illumination, subtle rim light.
- Kufi must read as a real Islamic prayer cap: correct forehead fit, believable cloth thickness, gentle folds; not a turban, not a baseball cap.
- Hijab must read as a real headscarf: volumetric drape, hair fully covered, face framing, shoulder drape; not a flat polygon.
- Never include mosque / crescent / religious phrase graphics on clothing.
- No exaggerated regional stereotypes.

## After adding files

1. Drop the WebPs into this folder using the filenames above.
2. Run:

   ```bash
   node scripts/scan-avatar-assets.mjs
   ```

   The script rewrites `AVATAR_ASSETS_AVAILABLE` in `lib/avatar/assets.ts`
   with entries for every preset id that now has an asset present.

3. Rerun `npm run build`. No DB migration, no schema change, no code edits
   in the component tree.

## Current status

**No premium 3D renders shipped yet.** Every avatar renders via the SVG
fallback in `components/avatar/tasbih-avatar.tsx`. This is deliberate — the
fallback is dignified and functional but not the final avatar design.
