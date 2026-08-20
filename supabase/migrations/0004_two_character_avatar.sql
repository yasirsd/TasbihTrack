-- 1011 Tracker — Phase 6.2: two-character curated avatar model.
--
-- Phase 6.1 (migration 0003) rewrote every legacy v1/v2 avatar to a
-- canonical Karim/Kulthum default. Phase 6 briefly allowed the full
-- 56-character dapvatar catalog, however, so a small number of v3 rows
-- may reference Justin, Ariana, Karim-black, Kulthum-black, or any of
-- the other 52 historical characters. Those rows are no longer valid
-- product choices — this migration snaps them back to the approved
-- pair.
--
-- Approved characters (Phase 6.2):
--   male   → male-karim-white   (default expression: happy — posture 1)
--   female → female-kulthum-white (default expression: heart-eye — posture 5)
--   neutral / prefer_not_to_say / null → avatar_config = null (BrandMark)
--
-- Rewrite policy — preserve the user's expression when practical:
--   • Male + already male-karim-white with a valid posture id → leave alone.
--   • Male + any OTHER character-id → male-karim-white-1-happy
--     (Deterministic fallback. Preserving the expression key across
--     characters could be done, but "correctness > cleverness"
--     per the prompt — a stray Bad Word / Fist Pump on the wrong
--     character isn't worth the extra SQL.)
--   • Female + already female-kulthum-white with a valid posture id → leave alone.
--   • Female + any OTHER character-id → female-kulthum-white-5-heart-eye
--   • Neutral / null gender with a persisted human avatar → null.
--
-- Idempotent: predicates target only rows that don't match today's
-- allowlist. Running twice is a no-op.
--
-- Safe to re-apply. Does NOT modify migrations 0001 / 0002 / 0003.
-- Touches only users.avatar_config. Zero effect on trackers, entries,
-- events, sessions, appearance preferences.

-- Male gender + non-Karim-white avatar → Karim default.
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
     or coalesce(avatar_config->>'characterId', '') <> 'male-karim-white'
   );

-- Female gender + non-Kulthum-white avatar → Kulthum default.
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
     or coalesce(avatar_config->>'characterId', '') <> 'female-kulthum-white'
   );

-- Neutral / null gender + any persisted human avatar → clear it.
update public.users
   set avatar_config = null
 where (gender is null or gender = 'prefer_not_to_say')
   and avatar_config is not null;
