-- Habit Coach: difficulty tracking, weekly review timestamps, adjustment audit log

ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS difficulty_level int NOT NULL DEFAULT 1;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_coach_review_at timestamptz;

CREATE TABLE IF NOT EXISTS public.habit_adjustments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES public.users(id) ON DELETE CASCADE,
  habit_id        uuid REFERENCES public.habits(id) ON DELETE SET NULL,
  adjustment_type text NOT NULL,
  current_value   jsonb NOT NULL DEFAULT '{}'::jsonb,
  proposed_value  jsonb NOT NULL DEFAULT '{}'::jsonb,
  status          text NOT NULL DEFAULT 'pending',
  user_note       text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,

  CONSTRAINT habit_adjustments_type_check CHECK (
    adjustment_type IN (
      'increase_difficulty',
      'decrease_difficulty',
      'shift_time',
      'change_cue',
      'flag_for_discussion'
    )
  ),
  CONSTRAINT habit_adjustments_status_check CHECK (
    status IN ('pending', 'accepted', 'rejected', 'dismissed')
  )
);

CREATE INDEX IF NOT EXISTS habit_adjustments_user_idx
  ON public.habit_adjustments(user_id);

CREATE INDEX IF NOT EXISTS habit_adjustments_habit_idx
  ON public.habit_adjustments(habit_id)
  WHERE habit_id IS NOT NULL;
