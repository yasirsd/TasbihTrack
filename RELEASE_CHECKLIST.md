# 1011 Tracker — Release Checklist

Manual QA that automated verification cannot do on its own. Every box must
be ticked (or explicitly waived) before this build ships.

Testers should use **real accounts against production Supabase**, not the
seeded dev DB. Sign in on at least one iOS device, one Android device, and
one desktop browser (Safari + Chrome).

---

## Database

- [ ] `0001_init.sql` applied to production Supabase
- [ ] `0002_user_profile.sql` applied to production Supabase
- [ ] `npm run db:test` succeeds with production `POSTGRES_URL`
- [ ] Registering a new user produces exactly one row in `users`, one in `sessions`, and no error rows in Vercel logs
- [ ] Legacy pre-0002 user (if any exist) can still sign in, and the Profile screen surfaces the "complete your profile" flow — no raw `column "first_name" does not exist` error

## Authentication

- [ ] New account: create → dashboard, session cookie present, HttpOnly + Secure
- [ ] Sign in with existing account (Remember Me ON) → cookie persists across browser restart (60-day server-side expiry)
- [ ] Sign in (Remember Me OFF) → cookie is set as a non-persistent / session cookie, server-side expiry is 1 day. Some browsers keep session cookies alive across a "restore previous session" restart, so the SERVER expiry is the authoritative logout — verify that after 24 h + 1 min, the session no longer authenticates even if the browser still has the cookie
- [ ] Sign out clears the session cookie and returns to `/`
- [ ] Expired session (`delete from sessions where user_id = ...` in Supabase) → next request redirects to `/`, no infinite loop, no crash
- [ ] Change password succeeds → user stays signed in on the current browser, other browsers' sessions are invalidated
- [ ] Login rate limit engages after 8 failed attempts within 15 minutes (per §21)
- [ ] Delete account: password required, then account + all owned data removed from Supabase, cookie cleared, browser IndexedDB snapshot + write queue for that user purged

## Data — trackers

- [ ] Create tracker → appears immediately, exists in `trackers` table, `tracker_created` event recorded
- [ ] Tapping "Create Goal" twice in a row (rapid double-tap) → exactly one tracker (idempotency via stable client UUID)
- [ ] Edit tracker → changes persist, `target_changed` / `daily_target_changed` events appear when the value actually changes
- [ ] Extending target (e.g. 100k → 150k) → progress % recomputes, Today's Target recomputes, milestone events at new target values fire correctly (§30)
- [ ] Pause → tracker disappears from Active section on Dashboard, still visible on the tracker detail page, resumable
- [ ] Archive → tracker moves to Archive route, restorable
- [ ] Delete tracker → removed from Dashboard AND from the DB, entries + events cascade-deleted

## Data — progress entries

- [ ] Add progress → total updates, per-day appears in Today's Target
- [ ] Rapid double-tap on Add Progress → exactly one entry (idempotency)
- [ ] Add progress that crosses a milestone (25/50/75) → confetti fires exactly once
- [ ] Add progress that completes the tracker (crosses 100) → completion celebration fires, tracker status becomes `completed`, `completed` event recorded
- [ ] Edit entry amount → totals recompute correctly
- [ ] Delete entry → totals recompute, Today counter accurate
- [ ] Add entry backdated 3 days → appears in History on the correct day, does NOT affect today's streak

## Cross-account isolation (critical — §6, §12)

- [ ] Sign in as User A → note a tracker UUID from browser devtools
- [ ] Sign out, sign in as User B → attempt to fetch/edit A's tracker by ID in devtools (Server Action call) → server rejects with "Tracker not found"
- [ ] Repeat for a progress entry UUID and for a tracker event ID
- [ ] With User A signed in, block network (DevTools "Offline"), add progress → optimistic entry appears
- [ ] Sign out (still offline) → sign in as User B → User A's optimistic entry MUST NOT appear on B's dashboard
- [ ] Bring User B online → their sync happens; A's queued entry stays in IndexedDB tagged with A's user_id
- [ ] Sign back in as A (online) → A's queued entry flushes cleanly, exactly one row in the DB, no duplicate

## Offline

- [ ] DevTools → Network → Offline, then add progress → entry appears optimistically, sync indicator shows "offline"
- [ ] Go back online → entry syncs (no duplicate), sync indicator returns to idle
- [ ] Offline + rapid double-add → exactly one entry when it eventually syncs
- [ ] Kill the tab while offline, reopen while still offline → queued entry still visible; sync happens on reconnect

## PWA / service worker

- [ ] Android Chrome: "Add to Home Screen" installs, opens standalone, `1011 Tracker` name + icon
- [ ] iOS Safari: install-instructions Sheet renders correctly, all 4 steps visible on iPhone SE-width viewport
- [ ] Offline, PWA cold-start opens the app shell (Dashboard cached), even when the network is off
- [ ] Manifest URL `/manifest.webmanifest` returns 200 with the correct name, icons resolve

### SERVICE WORKER VERSION UPDATE

- [ ] With the previous production build already installed as a PWA on the device, deploy a new build to production
- [ ] Open the installed PWA and refresh once — the browser downloads the new `sw.js`
- [ ] Refresh again — the new SW activates (`self.clients.claim()` runs)
- [ ] In DevTools → Application → Cache Storage: only `1011-v2` (or whatever VERSION the new build ships) is present. No stale cache from the previous build remains, and no page mixes old and new asset URLs
- [ ] The pre-rebrand `tasbih-v1` cache from any TasbihTrack-era installation is also gone

### OFFLINE ACCOUNT ISOLATION

- [ ] Sign in as User A, open Dashboard, then turn on airplane mode / DevTools Offline
- [ ] Add progress on one of A's trackers → optimistic entry appears; pending count > 0
- [ ] Sign out (still offline) → returns to the Sign In screen; A's optimistic UI is cleared from the render
- [ ] Sign in as User B (bring the network briefly back if the sign-in itself needs it, then go offline again if you want to test the rest offline) → B's Dashboard shows ONLY B's trackers; none of A's optimistic entries appear anywhere in B's UI
- [ ] While signed in as B, run `indexedDB.databases()` in the console — A's `by_user` queue entries are still in `write_queue`, but B's session never processes them (they're keyed by A's user_id)
- [ ] Sign out B, sign back in as A while online → A's queued entry(-ies) flush exactly once. The server row count matches what A added, no duplicates

### START URL / EXPIRED SESSION

- [ ] With the PWA installed and A signed in, close it. Reopen → app opens at `/app/dashboard` (matches manifest `start_url`)
- [ ] Force-expire A's session server-side (`delete from sessions where user_id = ...` in Supabase)
- [ ] Reopen the installed PWA — the app cleanly reaches the Sign In screen. No redirect loop, no error boundary, no crash. The URL bar settles on `/`
- [ ] Sign back in as A → Dashboard loads normally, no leftover error state

## UI — mobile

- [ ] iPhone SE (320 wide) — nothing overflows horizontally on Dashboard, Tracker detail, Create Goal, Add Progress
- [ ] iPhone 15 Pro (390 wide) — same
- [ ] Pixel 8 (412 wide) — same
- [ ] Keyboard-open state on Create Goal + Add Progress — form fields stay visible above the keyboard, Save button reachable via scroll
- [ ] Bottom nav honors safe-area on notched devices
- [ ] Long tracker name (60+ chars) truncates on Dashboard card, wraps safely on Tracker detail
- [ ] Arabic text renders right-to-left with correct voice (VoiceOver / TalkBack read Arabic pronunciation)

## UI — desktop / tablet

- [ ] Desktop 1440×900 — side rail replaces bottom nav, content sits under `max-w-4xl`
- [ ] iPad-portrait 768×1024 — content is single-column, bottom nav present
- [ ] Dark theme + light theme — both look intentional, no white-on-white or black-on-black

## Celebrations

- [ ] 25% milestone → confetti fires, no double-fire on refresh
- [ ] 50% milestone → confetti fires
- [ ] 75% milestone → confetti fires
- [ ] 100% completion → completion celebration (distinct from milestone), tracker status flips to completed

## Backup / restore

- [ ] Export → downloads `1011tracker-<username>-YYYY-MM-DD.json`; opening the file shows `version: 2`, no `password_hash` / `token` / secrets anywhere
- [ ] Import a valid backup → warning dialog names the file; on confirm, current data is replaced (§37 documented semantics: restore is destructive)
- [ ] Import a truncated file (delete a `]`) → import rejected with "Invalid backup file", DB unchanged
- [ ] Import a file with `version: 1` → rejected
- [ ] Import someone else's backup while signed in as User A → all trackers/entries land in A's account only, never leak

## Security model — reference (not a checkbox)

Two mechanisms enforce user boundaries. They are complementary, not
interchangeable:

1. **Authorization** — every server query includes an explicit
   `where user_id = $authenticated_user_id` predicate, where the user_id
   is derived from the HttpOnly session cookie via `requireUser()`. The
   pooled `postgres` role used from Next.js has `BYPASSRLS`, so RLS is
   NOT the boundary from the app's side — those per-query predicates are.
   The RLS-with-zero-policies + `revoke all` on `anon`/`authenticated`
   protects against direct PostgREST access to the same tables (which
   nothing in the app uses, but is still a defence in depth).
2. **Relational consistency** — the composite foreign keys
   `(tracker_id, user_id) → trackers(id, user_id)` on entries and
   events guarantee, at the DB level, that a child row always shares a
   user_id with its parent tracker. This blocks orphan rows and blocks
   a bug in the app from linking one user's entry to another user's
   tracker. It does NOT decide whether a query is allowed to return a
   row — that is (1)'s job.

If a future Server Action forgets a `user_id` predicate, the composite
FKs will not rescue it. The predicate is the authorization boundary.

## Security spot-checks

- [ ] Response headers on `/app/dashboard` include `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `/sw.js` response has `Cache-Control: no-cache, no-store`
- [ ] `curl -I` on any route shows no `Set-Cookie` echoing the session token in logs
- [ ] Vercel function logs contain no full request bodies with `password`, `SESSION_SECRET`, `POSTGRES_URL`, or `tt_sid`

## Environment

- [ ] `POSTGRES_URL` set in Vercel production env
- [ ] `SESSION_SECRET` set in Vercel production env (32+ random bytes)
- [ ] Supabase CA cert bundled under `./certs/` and reachable at runtime (`db:test` proves this)
- [ ] `.env.local` NOT committed to git

---

## Known deferred items — accepted, not blockers

- **`postcss` and `sharp` advisories are now patched via `overrides` in `package.json`** while remaining on Next 15.5.23:
  - `postcss` → `^8.5.26` (fixes GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q, GHSA-fxqj-rqcc-2cmp, GHSA-r28c-9q8g-f849)
  - `sharp` → `^0.35.3` (fixes GHSA-f88m-g3jw-g9cj / libvips CVE-2026-33327 et al)
  - Verified: full pipeline (typecheck, tests, lint, sql lint, build, db:test) stays green with overrides applied.
- **Remaining `npm audit` findings are all dev/test-only** (`vitest`, `@vitest/mocker`, `vite`, `vite-node`, `esbuild`, `happy-dom`). Not bundled into the production build, not reachable at runtime by end users. Fix path is `vitest@4.x` + `happy-dom@20.x` (both major-version bumps). Deferred — will be revisited in a post-freeze test-tooling upgrade pass.
- Real 3D avatar assets (`public/avatars/v2/*.webp`) not yet produced. SVG fallback ships as-is; drop assets + run `npm run avatars:scan` when ready.

---

## Sign-off

- [ ] Owner has QA'd the checklist above on at least one iOS + one Android device
- [ ] Owner has QA'd both dark and light themes on desktop
- [ ] Owner accepts remaining deferred items

Once every box above is ticked, tag the release and cut the deploy.
