# TasbihTrack — Phase 2 (cloud) setup

Phase 2 moves the source of truth to Supabase Postgres. The browser never talks to the database directly; all reads and mutations go through Next.js server actions and Route Handlers.

## 0. Required rotation (do this first)

If any of the following ever appeared outside a private secret store (e.g. in chat, in email, in screenshots), regenerate them before shipping cloud auth to real users:

- Supabase **secret key** (`sb_secret_…`) — Dashboard → Project Settings → API keys → *Regenerate*
- Supabase **service_role key** (JWT) — same page → *Regenerate* (only if you actually still use it; Phase 2 does not)
- Supabase **JWT secret** — Dashboard → Project Settings → API → *Reset JWT secret* (only if you use Supabase Auth; Phase 2 does not)
- **Database password** — Dashboard → Project Settings → Database → *Reset database password*

After rotating, let the Vercel/Supabase integration re-sync, or manually update the env vars in Vercel → Project Settings → Environment Variables.

## 1. Environment variables

Copy `.env.example` to `.env.local` and fill in:

- `POSTGRES_URL` — the Supabase pooled Postgres URL (from the Vercel integration).
- `SESSION_SECRET` — a fresh 32+ byte random string, generated with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
  ```

The client bundle only ever imports its own tiny env surface — Postgres URL and session secret never cross into browser code.

## 2. Apply the database migration

Run the SQL in `supabase/migrations/0001_init.sql` against your database. Two easy paths:

**Path A — Supabase SQL Editor (no CLI required):**
1. Open the Supabase Dashboard → SQL Editor.
2. Paste the contents of `supabase/migrations/0001_init.sql`.
3. Run it.

**Path B — Supabase CLI:**
```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

The migration is idempotent (`create table if not exists …`) and safe to re-apply.

Optional cleanup: if a `public.notes` table was created by the Supabase quickstart, drop it — TasbihTrack does not use it.

## 3. Local development

```bash
npm install
npm run dev
```

## 4. Production deployment (Vercel)

The Vercel Supabase integration auto-injects Postgres env vars. Add `SESSION_SECRET` in Vercel → Project Settings → Environment Variables → Production/Preview/Development, then redeploy.

## 5. Schema at a glance

- `users` — UUID id, unique normalized username, bcrypt password hash, JSONB prefs.
- `sessions` — SHA-256 hash of the session token, `expires_at`, `last_seen_at`, `user_agent`; the raw token lives only in an HttpOnly cookie.
- `trackers` — UUID id, `user_id`, target counts (bigint), status enum (`active`/`paused`/`completed`/`archived`), pin/sort, timestamps, soft-delete.
- `progress_entries` — UUID id, `user_id`, `tracker_id`, positive `amount` (bigint), `entry_date` (DATE, not timestamp — no UTC drift), note, soft-delete.
- `tracker_events` — journey timeline (created / target_changed / milestone_reached / paused / resumed / completed / reopened / archived / restored / starting_progress), `event_data` JSONB.
- `login_attempts` — 15-minute sliding window per normalized username for lightweight throttling.

Constraints, indexes and FKs are all in the migration.

## 6. Phase 1 → cloud migration

On first sign-in with a cloud account, if the *same normalized username* exists locally in IndexedDB, the app offers an *Import local progress* dialog with a summary. The import runs in one server-side transaction, generates fresh UUIDs, remaps tracker→entry references, and marks a `local_migration_completed_at` flag so re-runs are no-ops. Local Phase 1 data is preserved.

## 7. Security posture

- Passwords hashed with **bcrypt** (cost 12); Argon2id was skipped only because it needs a native binary that complicates Vercel builds — bcrypt is the recommended fallback per the spec.
- Sessions: opaque 32-byte token in an HttpOnly, Secure (in production), SameSite=Lax cookie. Only `sha256(token)` is stored.
- User ownership is derived from the session on every mutation — the browser never supplies a `user_id`.
- All queries parameterized (`pg`).
- Backup import scopes every row to the authenticated user.
- Login throttling: 8 failed attempts per 15 minutes per username returns a generic `invalid_credentials` and refuses further attempts.
- Change password revokes every other session for the user.

## 8. What is not built (yet)

- **Offline write queue** — reads work offline from the IndexedDB cache; add-progress currently requires a live network round-trip. Adding a durable queue is a modest extension over the current architecture; it just wasn't in this pass.
- **Supabase Realtime** — deliberately avoided per the spec. The app refreshes on tab focus / reconnect.
- **Argon2id** — skipped in favor of bcrypt for Vercel Node-runtime compatibility.
