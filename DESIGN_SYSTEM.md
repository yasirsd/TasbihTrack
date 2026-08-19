# 1011 Tracker — Design System

Short reference for anyone editing UI. Follow the token/pattern rather
than introducing one-off `rounded-[…]`, `p-[…]`, arbitrary opacities, or
new colors. Deviations are OK when there's a clear reason — the point of
the doc is that they should be conscious, not accidental.

## Colors

Brand accents (used sparingly, never as full-screen washes):

| Token | Value | Usage |
| --- | --- | --- |
| Crimson | `#EF233C` | Primary CTA, active state, key emphasis |
| Crimson-deep | `#B21728` | Gradient partner for buttons/completed states |
| Gold | `#FDC500` | Milestones, completed goals, Today reached |
| Gold-soft | `#FFD84A` | Celebration surfaces, subtle emphasis |

Everything else uses the semantic HSL tokens defined in
`app/globals.css` (`background`, `foreground`, `muted`, `card`,
`border`, `ring`, `destructive`, `success`). Never hard-code arbitrary
neutrals.

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
