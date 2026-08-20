-- 1011 Tracker — Phase 6.1: retire the v1/v2 SVG avatar system.
--
-- Every existing profile carrying a v1/v2 avatar config is rewritten to
-- the appropriate v3 Dapvatar default (or nulled for neutral gender).
-- Existing v3 rows are left ALONE — a user who already saved a custom
-- Dapvatar avatar via Phase 6 Avatar Studio keeps their choice.
--
-- Owner-approved canonical defaults (verified against dapvatar@0.1.4
-- MEMOJI_CATALOG):
--
--   male   → male-karim-white   + posture male-karim-white-1-happy
--   female → female-kulthum-white + posture female-kulthum-white-5-heart-eye
--   prefer_not_to_say / null → NULL (renderer draws the 1011 BrandMark)
--
-- Idempotent: the WHERE clauses target ONLY legacy shapes. Running
-- twice is a no-op.
--
-- Safe to re-apply. Does NOT modify 0001_init.sql or 0002_user_profile.sql.

-- Male gender + legacy avatar → Karim default.
update public.users
   set avatar_config = jsonb_build_object(
     'version',      3,
     'engine',       'dapvatar',
     'characterId',  'male-karim-white',
     'postureId',    'male-karim-white-1-happy'
   )
 where gender = 'male'
   and (
     avatar_config is null
     or coalesce(avatar_config->>'version', '') <> '3'
     or coalesce(avatar_config->>'engine', '')  <> 'dapvatar'
   );

-- Female gender + legacy avatar → Kulthum default.
update public.users
   set avatar_config = jsonb_build_object(
     'version',      3,
     'engine',       'dapvatar',
     'characterId',  'female-kulthum-white',
     'postureId',    'female-kulthum-white-5-heart-eye'
   )
 where gender = 'female'
   and (
     avatar_config is null
     or coalesce(avatar_config->>'version', '') <> '3'
     or coalesce(avatar_config->>'engine', '')  <> 'dapvatar'
   );

-- Neutral or unknown gender with a legacy avatar → clear it, so the
-- renderer falls back to the 1011 BrandMark. Do NOT touch rows that
-- already hold a valid v3 Dapvatar avatar.
update public.users
   set avatar_config = null
 where (gender is null or gender = 'prefer_not_to_say')
   and avatar_config is not null
   and (
     coalesce(avatar_config->>'version', '') <> '3'
     or coalesce(avatar_config->>'engine', '')  <> 'dapvatar'
   );
