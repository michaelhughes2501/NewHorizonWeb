-- 002_web_api.sql
-- Columns and triggers the NewHorizonWeb Express API needs on the Neon
-- "New_Horizons" project. Safe to run more than once.
--
-- 1. Profile settings the web app reads and writes that the Neon schema
--    did not have yet (they lived on the old Supabase profiles table).
-- 2. NOTIFY triggers so the API can push new messages and notifications to
--    signed-in browsers over Server-Sent Events (replaces Supabase Realtime).
--    Payloads carry ids only, never message text, so they stay far below the
--    8000-byte NOTIFY limit and nothing private travels on the channel.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url     text,
  ADD COLUMN IF NOT EXISTS public_profile boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_state     boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_notifs    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_notifs   boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_profiles_public
  ON public.profiles (last_seen DESC)
  WHERE public_profile = true AND is_banned = false;

CREATE OR REPLACE FUNCTION public.fn_notify_message() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_recipient uuid;
BEGIN
  SELECT CASE WHEN participant1_id = NEW.sender_id THEN participant2_id
              ELSE participant1_id END
    INTO v_recipient
    FROM public.conversations WHERE id = NEW.conversation_id;
  PERFORM pg_notify('nh_events', json_build_object(
    'kind', 'message',
    'id', NEW.id,
    'user_ids', json_build_array(NEW.sender_id, v_recipient)
  )::text);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_message ON public.messages;
CREATE TRIGGER trg_notify_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_message();

CREATE OR REPLACE FUNCTION public.fn_notify_notification() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('nh_events', json_build_object(
    'kind', 'notification',
    'id', NEW.id,
    'user_ids', json_build_array(NEW.user_id)
  )::text);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_notification ON public.notifications;
CREATE TRIGGER trg_notify_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_notification();

CREATE TABLE IF NOT EXISTS public.app_migrations (
  name       text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.app_migrations (name) VALUES ('002_web_api.sql')
  ON CONFLICT (name) DO NOTHING;

COMMIT;
