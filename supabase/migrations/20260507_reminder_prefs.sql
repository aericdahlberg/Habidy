-- User-level reminder preferences and timezone
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{
    "email_reminder_enabled": false,
    "auto_dismiss_when_logged": true,
    "default_minutes_before": [15, 0]
  }'::jsonb;

-- Habit-level calendar integration and reminder overrides
ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS google_calendar_event_id text,
  ADD COLUMN IF NOT EXISTS reminder_enabled       boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_minutes_before int[],   -- null = inherit global default
  ADD COLUMN IF NOT EXISTS reminder_time          text;     -- null = use suggested_time from Architect

CREATE INDEX IF NOT EXISTS habits_gcal_event_idx
  ON public.habits(google_calendar_event_id)
  WHERE google_calendar_event_id IS NOT NULL;
