-- Google Calendar OAuth tokens (server-side only — no client RLS policies)
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token  text      NOT NULL,
  refresh_token text      NOT NULL,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Connection status flag readable by the client via the existing users table RLS
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS google_calendar_connected boolean NOT NULL DEFAULT false;
