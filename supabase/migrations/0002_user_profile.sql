-- 1011 Tracker — user profile fields
--
-- Adds first_name, last_name, gender, avatar_config to users.
--
-- IMPORTANT: every new column is NULLABLE with no default backfill so
-- existing production accounts remain valid. A pre-migration user signing
-- in continues to work; the app surfaces an optional "Complete profile"
-- flow client-side.
--
-- Safe to re-apply — every statement is guarded.

alter table public.users
  add column if not exists first_name    text,
  add column if not exists last_name     text,
  add column if not exists gender        text,
  add column if not exists avatar_config jsonb;

-- Gender values are constrained to a known set; NULL is allowed for legacy
-- users who haven't completed their profile yet.
do $$ begin
  alter table public.users
    add constraint users_gender_chk
      check (gender is null or gender in ('male', 'female', 'prefer_not_to_say'));
exception when duplicate_object then null; end $$;

-- Length caps (Unicode-safe, generous). Trim happens application-side.
do $$ begin
  alter table public.users
    add constraint users_first_name_len_chk
      check (first_name is null or char_length(first_name) between 1 and 60);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.users
    add constraint users_last_name_len_chk
      check (last_name is null or char_length(last_name) between 0 and 60);
exception when duplicate_object then null; end $$;

comment on column public.users.first_name is
  'User-supplied first name. Nullable to preserve pre-migration accounts.';
comment on column public.users.last_name is
  'User-supplied last name. Optional even when profile is otherwise complete.';
comment on column public.users.gender is
  'One of male / female / prefer_not_to_say. Drives default Tasbih avatar.';
comment on column public.users.avatar_config is
  'Whitelisted JSONB describing the Tasbih avatar preset + tweaks.';
