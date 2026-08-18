-- TasbihTrack Phase 2 — initial schema
-- Safe to re-apply.

create extension if not exists "pgcrypto";

-- =========================
-- USERS
-- =========================
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

-- =========================
-- SESSIONS
-- =========================
create table if not exists public.sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  token_hash    text not null unique,
  user_agent    text,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  expires_at    timestamptz not null
);
create index if not exists sessions_user_id_idx on public.sessions(user_id);
create index if not exists sessions_expires_at_idx on public.sessions(expires_at);

-- =========================
-- LOGIN ATTEMPTS (lightweight throttle)
-- =========================
create table if not exists public.login_attempts (
  id                  bigserial primary key,
  username_normalized text not null,
  attempted_at        timestamptz not null default now(),
  success             boolean not null
);
create index if not exists login_attempts_lookup_idx
  on public.login_attempts (username_normalized, attempted_at desc);

-- =========================
-- TRACKERS
-- =========================
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
create index if not exists trackers_user_active_idx
  on public.trackers (user_id, status, is_pinned desc, sort_order asc)
  where deleted_at is null;
create index if not exists trackers_user_id_idx on public.trackers(user_id);

-- =========================
-- PROGRESS ENTRIES
-- =========================
create table if not exists public.progress_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  tracker_id   uuid not null references public.trackers(id) on delete cascade,
  amount       bigint not null,
  entry_date   date not null,
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  constraint entries_amount_chk check (amount > 0),
  constraint entries_note_chk   check (note is null or char_length(note) <= 500)
);
create index if not exists entries_user_date_idx
  on public.progress_entries (user_id, entry_date desc)
  where deleted_at is null;
create index if not exists entries_tracker_date_idx
  on public.progress_entries (tracker_id, entry_date desc)
  where deleted_at is null;
create index if not exists entries_user_tracker_idx
  on public.progress_entries (user_id, tracker_id)
  where deleted_at is null;

-- =========================
-- TRACKER EVENTS (journey)
-- =========================
create table if not exists public.tracker_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  tracker_id   uuid not null references public.trackers(id) on delete cascade,
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
create index if not exists tracker_events_tracker_idx
  on public.tracker_events (tracker_id, occurred_at desc);
create index if not exists tracker_events_user_idx
  on public.tracker_events (user_id, occurred_at desc);
-- Prevent duplicate milestone events at the same percent for a tracker.
create unique index if not exists tracker_events_milestone_unique
  on public.tracker_events (tracker_id, (event_data->>'percent'))
  where event_type = 'milestone_reached';

-- =========================
-- Trigger to keep updated_at fresh
-- =========================
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
