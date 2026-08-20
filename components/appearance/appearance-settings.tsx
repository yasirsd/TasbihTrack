"use client";
import * as React from "react";
import { Check, Moon, Palette, Sparkles, Sun } from "lucide-react";
import { useAppearance } from "@/components/appearance/appearance-provider";
import { Segmented } from "@/components/ui/segmented";
import {
  COLOR_THEMES,
  COLOR_THEME_DESCRIPTION,
  COLOR_THEME_LABEL,
  type ColorMode,
  type ColorTheme,
} from "@/lib/appearance/types";
import { cn } from "@/lib/utils";

/**
 * The Appearance settings surface for Profile → Appearance
 * (see PROMPT 5B §39–§45).
 *
 * Three independent controls stacked vertically:
 *   1. COLOR — 5 swatch tiles, each shows a live-preview of its palette
 *   2. INTERFACE — Standard / Playful Clay segmented
 *   3. MODE — System / Light / Dark segmented
 *
 * Selecting a color is instant. There's no Save button — the choice is
 * applied to the root data attribute + cookie + user preferences
 * asynchronously. If the server persist fails, we log and keep the
 * local choice (the cookie survives so the next page load is stable).
 */
export function AppearanceSettings() {
  const { appearance, setColorTheme, setUIStyle, setColorMode } = useAppearance();

  return (
    <div className="space-y-6">
      {/* COLOR */}
      <div className="space-y-3">
        <SubLabel icon={<Palette className="h-3.5 w-3.5" />}>Color</SubLabel>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {COLOR_THEMES.map((theme) => (
            <ColorSwatch
              key={theme}
              theme={theme}
              selected={appearance.colorTheme === theme}
              onSelect={() => setColorTheme(theme)}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {COLOR_THEME_DESCRIPTION[appearance.colorTheme]}
        </p>
      </div>

      {/* INTERFACE STYLE */}
      <div className="space-y-2">
        <SubLabel icon={<Sparkles className="h-3.5 w-3.5" />}>Interface</SubLabel>
        <Segmented<"standard" | "clay">
          ariaLabel="Interface style"
          value={appearance.uiStyle}
          onChange={setUIStyle}
          options={[
            { value: "standard", label: "Standard" },
            { value: "clay", label: "Playful Clay" },
          ]}
        />
        <p className="text-xs text-muted-foreground">
          {appearance.uiStyle === "clay"
            ? "Chunky, dimensional surfaces with tactile depth."
            : "Clean, restrained, premium."}
        </p>
      </div>

      {/* COLOR MODE */}
      <div className="space-y-2">
        <SubLabel>Mode</SubLabel>
        <Segmented<ColorMode>
          ariaLabel="Color mode"
          value={appearance.colorMode}
          onChange={setColorMode}
          options={[
            { value: "system", label: "System" },
            {
              value: "light",
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <Sun className="h-3.5 w-3.5" /> Light
                </span>
              ),
            },
            {
              value: "dark",
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <Moon className="h-3.5 w-3.5" /> Dark
                </span>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

function SubLabel({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
      {icon}
      {children}
    </p>
  );
}

/**
 * Concrete-hex preview stripe per theme.
 *
 * Why not `hsl(var(--brand-1))`? The theme palettes are defined in
 * globals.css under `:root[data-color-theme="…"]` — that selector ONLY
 * matches the html root, not any nested element. A nested container
 * setting `data-color-theme` doesn't re-scope the custom properties, so
 * every swatch would resolve to the CURRENTLY ACTIVE theme's palette
 * (the visible bug that made every tile crimson/gold).
 *
 * Keeping a small dedicated hex table here decouples the preview from
 * the runtime CSS-variable cascade. Values are picked to sit near the
 * middle of each theme's palette so the tile reads as a recognisable
 * summary of the full appearance. When globals.css tokens shift, update
 * these too — they're intentionally close cousins of the CONFETTI_PALETTES
 * in lib/appearance/confetti-palettes.ts.
 */
const SWATCH_PREVIEW: Record<ColorTheme, [string, string, string]> = {
  original: ["#EF233C", "#B21728", "#FDC500"], // Crimson · Crimson-deep · Gold
  ruby: ["#D91E62", "#8F1A47", "#F17A55"],     // Ruby · deep · warm peach
  emerald: ["#0E9C6E", "#0A6B4E", "#E7B940"],  // Emerald · deep · mustard
  violet: ["#7C3AED", "#5B21B6", "#EAB040"],   // Violet · deep · gold
  sunset: ["#F26A20", "#B84512", "#FDC000"],   // Coral · deep · sunny yellow
};

/**
 * Each swatch previews its palette without switching the app to it.
 *
 * Selected state is signalled with a check icon + ring + label weight,
 * NOT color alone (a11y §91). The check is absolutely positioned over
 * the preview stripe so it never contends for horizontal space with
 * the label — labels like "Emerald Garden" and "Royal Violet" would
 * otherwise truncate to "Emerald…" / "Royal…" beside the checkmark
 * (the original bug that showed "Origi…" on Original in the owner's
 * screenshot).
 */
function ColorSwatch({
  theme,
  selected,
  onSelect,
}: {
  theme: ColorTheme;
  selected: boolean;
  onSelect: () => void;
}) {
  const label = COLOR_THEME_LABEL[theme];
  const [c1, c2, c3] = SWATCH_PREVIEW[theme];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${label}${selected ? " (selected)" : ""}`}
      className={cn(
        "clay-btn group relative flex flex-col items-stretch overflow-hidden rounded-3xl border p-0 text-left transition-[transform,box-shadow,border-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background touch-manipulation active:scale-[0.98]",
        selected
          ? "border-foreground/60 shadow-[0_10px_30px_-12px_hsl(var(--brand-1)/0.5)]"
          : "border-border/60 hover:border-foreground/30",
      )}
    >
      <div className="relative grid h-16 grid-cols-3 gap-0">
        <div style={{ background: c1 }} />
        <div style={{ background: c2 }} />
        <div style={{ background: c3 }} />
        {selected && (
          <span
            aria-hidden
            className="absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background shadow-sm ring-2 ring-background"
          >
            <Check className="h-3 w-3" />
          </span>
        )}
      </div>
      <div className="px-3 py-2">
        <span
          className={cn(
            "block truncate text-xs",
            selected ? "font-semibold text-foreground" : "text-muted-foreground",
          )}
        >
          {label}
        </span>
      </div>
    </button>
  );
}
