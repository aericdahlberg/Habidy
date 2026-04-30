ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS engagement_mode text
  CHECK (engagement_mode IN ('quick', 'guided', 'deep'));