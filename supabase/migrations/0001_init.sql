-- TasbihTrack Phase 2 — initial schema (production-hardened)
--
-- Design notes for the reader:
--   • The application never talks to Postgres from the browser. All access
--     goes through Next.js server actions using a direct pg connection
--     (the Supabase pooled `postgres` role, which has BYPASSRLS).
--   • Supabase's Data API (PostgREST) exposes tables in `public` to the
--     `anon` and `authenticated` roles by default. We DO NOT want that.
--     We enable RLS with zero policies AND revoke privileges from those
--     roles so PostgREST returns "permission denied" for any table below.
--   • User ownership is enforced two ways:
--       1. Server derives user_id from the session — never trusts input.
--       2. Composite foreign keys guarantee child rows (entries, events)
--          share a user_id with their parent tracker at the DB level.
--   • Milestone events are uniquely keyed on (tracker, percent, target).
--     Extending a target creates a fresh "50% reached" event because the
--     targetAtTime component changes — the old milestone remains as
--     history, the new one is inserted correctly.
--
-- Safe to re-apply.

create extension if not exists "pgcrypto";

-- =====================================================================
-- USERS
-- =====================================================================
create table if not exists public.users (
  id                  uuid primary key default gen_random_uuid(),
  username            text not null,
  username_normalized text not null,
  password_hash       text not null,
  preferences         jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint users_username_normalized_key unique (username_normalized),
  constraint users_username_len_chk check (char_length(username_normalized) between 3 and 20),
  constraint users_username_shape_chk check (username_normalized ~ '^[a-z0-9_]+$')
);

-- =====================================================================
-- SESSIONS
-- =====================================================================
create table if not exists public.sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  token_hash    text not null unique,
  user_agent    text,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  expires_at    timestamptz not null,
  constraint sessions_expires_after_created_chk check (expires_at > created_at)
);
create index if not exists sessions_user_id_idx on public.sessions(user_id);
create index if not exists sessions_expires_at_idx on public.sessions(expires_at);

-- =====================================================================
-- LOGIN ATTEMPTS (throttle log; server-only)
-- =====================================================================
create table if not exists public.login_attempts (
  id                  bigserial primary key,
  username_normalized text not null,
  attempted_at        timestamptz not null default now(),
  success             boolean not null
);
create index if not exists login_attempts_lookup_idx
  on public.login_attempts (username_normalized, attempted_at desc);

-- =====================================================================
-- TRACKERS
-- =====================================================================
do $$ begin
  create type public.tracker_status as enum ('active', 'paused', 'completed', 'archived');
exception when duplicate_object then null; end $$;

create table if not exists public.trackers (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  name           text not null,
  arabic_text    text,
  description    text,
  target_count   bigint not null,
  daily_target   bigint,
  target_date    date,
  status         public.tracker_status not null default 'active',
  is_pinned      boolean not null default false,
  sort_order     integer not null default 0,
  started_at     timestamptz not null default now(),
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  constraint trackers_name_chk         check (char_length(name) between 1 and 120),
  constraint trackers_target_chk       check (target_count > 0),
  constraint trackers_daily_target_chk check (daily_target is null or daily_target > 0)
);

-- Composite key required so child tables can reference (id, user_id) and
-- thus be guaranteed to share the owner. (id is PK so this is trivially
-- unique — the constraint exists purely to enable the composite FK below.)
do $$ begin
  alter table public.trackers add constraint trackers_id_user_key unique (id, user_id);
exception when duplicate_object then null; end $$;

create index if not exists trackers_user_active_idx
  on public.trackers (user_id, status, is_pinned desc, sort_order asc)
  where deleted_at is null;
create index if not exists trackers_user_id_idx on public.trackers(user_id);

-- =====================================================================
-- PROGRESS ENTRIES
-- =====================================================================
create table if not exists public.progress_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  tracker_id   uuid not null,
  amount       bigint not null,
  entry_date   date not null,
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  constraint entries_amount_chk check (amount > 0),
  constraint entries_note_chk   check (note is null or char_length(note) <= 500)
);

-- Replace any older single-column FK with a composite FK that enforces
-- the entry's user_id matches its tracker's user_id at the row level.
alter table public.progress_entries drop constraint if exists progress_entries_tracker_id_fkey;
do $$ begin
  alter table public.progress_entries
    add constraint progress_entries_tracker_user_fk
    foreign key (tracker_id, user_id)
    references public.trackers(id, user_id)
    on delete cascade;
exception when duplicate_object then null; end $$;

create index if not exists entries_user_date_idx
  on public.progress_entries (user_id, entry_date desc)
  where deleted_at is null;
create index if not exists entries_tracker_date_idx
  on public.progress_entries (tracker_id, entry_date desc)
  where deleted_at is null;
create index if not exists entries_user_tracker_idx
  on public.progress_entries (user_id, tracker_id)
  where deleted_at is null;

-- =====================================================================
-- TRACKER EVENTS (journey)
-- =====================================================================
create table if not exists public.tracker_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  tracker_id   uuid not null,
  event_type   text not null,
  event_data   jsonb not null default '{}'::jsonb,
  occurred_at  timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  constraint tracker_events_type_chk check (event_type in (
    'tracker_created',
    'starting_progress',
    'milestone_reached',
    'target_changed',
    'daily_target_changed',
    'paused',
    'resumed',
    'completed',
    'reopened',
    'archived',
    'restored',
    'note'
  ))
);

alter table public.tracker_events drop constraint if exists tracker_events_tracker_id_fkey;
do $$ begin
  alter table public.tracker_events
    add constraint tracker_events_tracker_user_fk
    foreign key (tracker_id, user_id)
    references public.trackers(id, user_id)
    on delete cascade;
exception when duplicate_object then null; end $$;

create index if not exists tracker_events_tracker_idx
  on public.tracker_events (tracker_id, occurred_at desc);
create index if not exists tracker_events_user_idx
  on public.tracker_events (user_id, occurred_at desc);

-- Milestone uniqueness is keyed on (tracker, percent, targetAtTime) so
-- that:
--   • Two INSERTs for the same milestone on the same target are idempotent
--     (`on conflict do nothing` from application code is a no-op).
--   • Extending or changing a tracker's target lets the same percentage
--     be recorded again at the new target value — the old milestone stays
--     as historical journey, the new one is inserted correctly.
drop index if exists public.tracker_events_milestone_unique;
create unique index if not exists tracker_events_milestone_unique
  on public.tracker_events (
    tracker_id,
    (event_data->>'percent'),
    (event_data->>'targetAtTime')
  )
  where event_type = 'milestone_reached';

-- =====================================================================
-- updated_at auto-touch
-- =====================================================================
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end
$$;

do $$ begin
  create trigger users_touch before update on public.users
    for each row execute function public.touch_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trackers_touch before update on public.trackers
    for each row execute function public.touch_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger entries_touch before update on public.progress_entries
    for each row execute function public.touch_updated_at();
exception when duplicate_object then null; end $$;

-- =====================================================================
-- SECURITY: lock Supabase Data API (PostgREST) out of every table.
--
-- Enabling RLS with zero policies means anon/authenticated get "row not
-- found" for reads and "permission denied" for writes through PostgREST.
-- We also explicitly revoke privileges so the API roles can't even
-- resolve the tables. The pooled `postgres` role we connect as from
-- Next.js has BYPASSRLS and its own privileges, so server-side queries
-- are unaffected.
-- =====================================================================
alter table public.users             enable row level security;
alter table public.sessions          enable row level security;
alter table public.login_attempts    enable row level security;
alter table public.trackers          enable row level security;
alter table public.progress_entries  enable row level security;
alter table public.tracker_events    enable row level security;

-- Belt-and-braces: revoke direct privileges from the Data API roles.
-- Guarded so this SQL still runs on a stock Postgres (roles absent).
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on public.users            from anon';
    execute 'revoke all on public.sessions         from anon';
    execute 'revoke all on public.login_attempts   from anon';
    execute 'revoke all on public.trackers         from anon';
    execute 'revoke all on public.progress_entries from anon';
    execute 'revoke all on public.tracker_events   from anon';
    execute 'revoke all on all sequences in schema public from anon';
    execute 'alter default privileges in schema public revoke all on tables from anon';
    execute 'alter default privileges in schema public revoke all on sequences from anon';
    execute 'alter default privileges in schema public revoke all on functions from anon';
  end if;
end $$;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on public.users            from authenticated';
    execute 'revoke all on public.sessions         from authenticated';
    execute 'revoke all on public.login_attempts   from authenticated';
    execute 'revoke all on public.trackers         from authenticated';
    execute 'revoke all on public.progress_entries from authenticated';
    execute 'revoke all on public.tracker_events   from authenticated';
    execute 'revoke all on all sequences in schema public from authenticated';
    execute 'alter default privileges in schema public revoke all on tables from authenticated';
    execute 'alter default privileges in schema public revoke all on sequences from authenticated';
    execute 'alter default privileges in schema public revoke all on functions from authenticated';
  end if;
end $$;

comment on table public.users            is 'Server-only. RLS on with no policies. Do not expose via PostgREST.';
comment on table public.sessions         is 'Server-only. Stores hash(session_token) — raw tokens live only in HttpOnly cookies.';
comment on table public.login_attempts   is 'Server-only. Sliding-window throttle log.';
comment on table public.trackers         is 'Server-only. RLS on with no policies.';
comment on table public.progress_entries is 'Server-only. Composite FK enforces owner match with tracker.';
comment on table public.tracker_events   is 'Server-only. Composite FK enforces owner match with tracker. Milestone uniqueness includes targetAtTime.';
