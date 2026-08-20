# 1011 Tracker — Design System

Short reference for anyone editing UI. Follow the token/pattern rather
than introducing one-off `rounded-[…]`, `p-[…]`, arbitrary opacities, or
new colors. Deviations are OK when there's a clear reason — the point of
the doc is that they should be conscious, not accidental.

## Appearance engine (Phase 5)

Three orthogonal presentation dimensions stamped on `<html>`:

- `data-color-theme` — `original` / `ruby` / `emerald` / `violet` / `sunset`
- `data-ui-style` — `standard` / `clay`
- `class="dark"` — managed by next-themes; color mode is `system` / `light` / `dark`

Feature components consume semantic CSS variables (`--background`,
`--brand-1`, `--clay-primary`, etc.) and NEVER branch on the theme name.
Every theme is defined once in `app/globals.css` under its
`:root[data-color-theme="…"]` block.

## Colors

Semantic brand tokens (theme-aware — resolve to the currently-selected
color theme's palette):

| Token | Purpose |
| --- | --- |
| `--brand-1` | Primary CTA, active state, key emphasis |
| `--brand-2` | Gradient partner (deep) for buttons / completed states |
| `--brand-gold` | Milestones, completed goals, Today reached |

Legacy Tailwind classes `bg-crimson` / `text-gold-deep` etc. are aliased
in `tailwind.config.ts` to `hsl(var(--brand-*))` so pre-existing code
retints automatically with the color theme.

Clay-specific tokens (also per-theme):
`--clay-bg` / `--clay-surface` / `--clay-surface-alt` / `--clay-inset` /
`--clay-primary` / `--clay-primary-2` / `--clay-accent` /
`--clay-highlight` / `--clay-shadow` / `--clay-ring`.

Confetti particle colors are the ONE exception — canvas-confetti's worker
cannot resolve CSS variables, so hex arrays per theme live in
`lib/appearance/confetti-palettes.ts`. Update them alongside the CSS
tokens.

Everything else uses semantic HSL tokens (`background`, `foreground`,
`muted`, `card`, `border`, `ring`, `destructive`, `success`,
`placeholder`). Never hard-code arbitrary neutrals.

## Clay primitives (scoped to `[data-ui-style="clay"]`)

The following classes are safe to apply UNCONDITIONALLY — their styles
only fire under Clay mode:

- `.clay-btn` (+ variant modifiers `.clay-btn-primary` / `-outline` / `-ghost`) — Button primitive already applies these
- `.clay-input` — Input + Textarea already apply this; inset cavity look
- `.clay-card` — repaints a card surface as a puffy Clay slab
- `.clay-row` — dense list-item Clay surface
- `.clay-metric` — small metric slab
- `.clay-well` — inset stat cavity
- `.clay-chip` — puffy chip
- `.clay-badge` (+ `.clay-badge-gold`) — dimensional badge (Journey / milestones)
- `.clay-segmented` — segmented control tray (auto-triggers raised selected pill via `data-active="true"`)
- `.clay-progress-track` / `.clay-progress-fill` — thick tube progress
- `.clay-day` — calendar day tile (consumes `data-selected` / `data-today`)
- `.clay-skeleton` — Clay-appropriate loading pulse
- `.clay-pill` — offline/status pill
- `.clay-rail` — vertical journey rail
- `.app-bottom-nav` — Clay repaint of the bottom nav

## Radius

Deliberate scale:

| Class | Use |
| --- | --- |
| `rounded-full` | Chips, pills, avatars, floating navigation |
| `rounded-2xl` | Inputs, textareas, buttons (except pills), small cards |
| `rounded-3xl` | Section-level cards, lists, sheets |
| `rounded-t-[32px]` | Bottom sheet top edge only |

Don't mix `rounded-lg` / `rounded-xl` in this codebase without a reason.

## Spacing

Page-level layout in `app/app/layout.tsx`:

```
max-w-3xl   mobile / narrow desktop content width
px-5        mobile page padding
lg:px-10    desktop page padding
pb-32       bottom padding to clear the fixed nav
pt-…safe    top padding accounts for the notch
xl:max-w-4xl wider content on very large screens
```

Section rhythm:

- `space-y-6` between primary sections in a route
- `space-y-3` inside a section
- `space-y-2` between form label + input
- `gap-2` inside chip rows and inline compositions

Card padding:

- Small card: `p-4`
- Standard card: `p-5`
- Hero card / sheet content: `p-6`

## Typography

- `text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground` — small section label style (used across dashboard "Today", "Active goals", "Past journeys", tracker "Today's target", etc.)
- `text-2xl font-semibold tracking-tight` — page/section titles
- `hero-number text-5xl font-semibold` — the number you want to dominate
- `tabular-nums` on every number that could shift width (progress totals, calendar days, time labels)

## Motion durations

Match perceived speed to the interaction weight:

- 120–180 ms — press/hover feedback
- 180–280 ms — normal transitions (Sheet, Dialog, tab)
- 300–450 ms — larger entrances (section enters, celebration)

Anything above 500ms is decorative and needs a reason.

## Glass

Glass is scoped — do NOT put backdrop-blur behind every card:

- Bottom navigation
- Sheets / Dialogs (surface + overlay)
- Toast, offline/sync indicator
- Desktop side rail

Content cards inside routes use plain `bg-card` with a border.
`text-muted-foreground/90` is the accepted "supporting text" shade.

## Arabic text

Every surface that renders Arabic must set BOTH:

```tsx
<span lang="ar" dir="rtl">…</span>
```

`dir="rtl"` alone is insufficient — screen readers use `lang` to pick the
correct voice/pronunciation. Don't apply RTL to surrounding English UI.

## Form fields — global placeholder policy

Every editable field renders through `<FormField label="…">` (see
`components/ui/form-field.tsx`). Rules:

- **Labels always persist** above the control — no placeholder-as-label.
- **Placeholders are example text only** using the weak `--placeholder`
  token, formatted `e.g. Durood Shareef` where practical.
- **No fake pre-populated `value` / `defaultValue`.** Examples belong in
  the placeholder / hint.
- `hint` is used for helper copy (e.g. target-amount readout).
- `error` renders an inline alert; `aria-describedby` / `aria-invalid`
  are wired automatically.

## Mobile keyboard architecture

Long forms mount `useEnsureFocusVisible(scrollRootRef)` (see
`lib/keyboard/use-keyboard-viewport.ts`). One module-level singleton
listens to `window.visualViewport.resize` and writes `--sheet-max-h` on
`<html>`; Sheet reads that variable. When a text control gets focus and
the visual viewport shrinks (keyboard opens), the focused field is
`scrollIntoView({ block: "center" })`-ed after a rAF.

Notes on why this is needed:

- Mobile virtual keyboards commonly resize/overlay the visual viewport
  independently of the page layout — CSS viewport units (`vh`, `dvh`)
  may not represent the actually usable area during keyboard display,
  particularly on iOS Safari.
- `window.visualViewport` is therefore used as an *enhancement* on top
  of the CSS `dvh` fallback. WebKit timing / offset quirks around focus
  and keyboard reveal remain possible; real-device verification is the
  final source of truth.
- No random `setTimeout` waits; only actual viewport resize / focus
  events.

## Appearance account-switch precedence

- **Sign-in**: server preference wins. Whatever the signed-in user has
  saved in `preferences.appearance` overwrites the local browser state
  and cookie.
- **New account / never-saved appearance**: local browser preference at
  sign-in becomes the account's stored default (persisted async).
- **Sign-out**: local appearance stays as-is. Cookie is not cleared, so
  the same browser sees the same look on the Sign In screen. No write
  back to the departed account.
- **Save failure**: local change is authoritative — the DOM + cookie
  are already updated. Server persist is fire-and-forget and logs on
  failure; no retry loop. A subsequent successful `updatePreferences`
  eventually catches the server up.
