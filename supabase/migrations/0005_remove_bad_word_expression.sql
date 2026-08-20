-- 1011 Tracker — Phase 6.2.1: remove the source-pack "bad-word" expression.
--
-- The curated 1011 manifest no longer lists posture #14 ("bad-word") for
-- either character. A user whose persisted avatar posture id ends with
-- "-14-bad-word" is snapped to the gender-appropriate DEFAULT expression
-- so nothing renders a removed posture and nothing fails the server
-- validation on the next profile update.
--
-- Snap targets:
--   male-karim-white-14-bad-word     → male-karim-white-1-happy
--   female-kulthum-white-14-bad-word → female-kulthum-white-5-heart-eye
--
-- Idempotent: predicates match only rows still carrying the removed
-- posture. Running twice is a no-op.
--
-- Safe to re-apply. Does NOT modify migrations 0001-0004. Touches only
-- users.avatar_config where its postureId is the removed one.

update public.users
   set avatar_config = jsonb_set(
     avatar_config,
     '{postureId}',
     to_jsonb('male-karim-white-1-happy'::text)
   )
 where avatar_config is not null
   and avatar_config->>'characterId' = 'male-karim-white'
   and avatar_config->>'postureId'   = 'male-karim-white-14-bad-word';

update public.users
   set avatar_config = jsonb_set(
     avatar_config,
     '{postureId}',
     to_jsonb('female-kulthum-white-5-heart-eye'::text)
   )
 where avatar_config is not null
   and avatar_config->>'characterId' = 'female-kulthum-white'
   and avatar_config->>'postureId'   = 'female-kulthum-white-14-bad-word';
