-- Weekly difficulty check-in: last_rated_at on habits + audit log table

ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS last_rated_at timestamptz;

CREATE TABLE IF NOT EXISTS public.habit_difficulty_logs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  habit_id              uuid REFERENCES public.habits(id) ON DELETE CASCADE NOT NULL,
  rating                text NOT NULL,
  difficulty_level_before int,
  created_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT habit_difficulty_logs_rating_check
    CHECK (rating IN ('too_easy', 'just_right', 'too_hard'))
);

CREATE INDEX IF NOT EXISTS habit_difficulty_logs_habit_idx
  ON public.habit_difficulty_logs(habit_id);