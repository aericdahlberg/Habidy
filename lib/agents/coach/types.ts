// Raw DB/API shapes — read from Supabase then passed into pure analysis functions

export type RawHabit = {
  id: string
  habit_name: string
  cue: string | null
  time_of_day: string | null
  reminder_time: string | null  // from habits.reminder_time (20260507_reminder_prefs.sql)
}

export type RawLog = {
  habit_id: string
  date: string
  completed: boolean
}

export type RawSurvey = {
  habit_id: string
  date: string
  went_wrong: string | null
  completion_level: 'full' | 'partial' | 'none' | null
}

export type RawCalendarEvent = {
  date: string // YYYY-MM-DD
}

// Per-habit analysis output

export type HabitBreakdown = {
  habitId: string
  habitName: string
  completionRate: number
  completedDays: number
  totalDays: number
  avgCompletionLevel: 'full' | 'partial' | 'none' | null
  commonWentWrong: string[]
  calendarConflictDays: number
}

export type DayOfWeekStat = {
  day: string
  completionRate: number
  missedCount: number
}

export type ProposedAdjustment = {
  habitId: string
  habitName: string
  type: 'increase_difficulty' | 'decrease_difficulty' | 'shift_time' | 'change_cue' | 'flag_for_discussion'
  rationale: string
  currentValue: string
  proposedValue: string
}

export type WeeklyAnalysis = {
  weekOf: string
  overallCompletionRate: number
  completedTotal: number
  possibleTotal: number
  habitBreakdown: HabitBreakdown[]
  dayOfWeekStats: DayOfWeekStat[]
  proposedAdjustments: ProposedAdjustment[]
  hasSurveyData: boolean
  hasCalendarData: boolean
}

// Agent context — passed into buildCoachUserContext

export type CoachContext = {
  userName: string
  identityStatement: string
  weeklyAnalysis: WeeklyAnalysis
  profileContext: string | null
  calendarContext: string | null
  priorAdjustmentsSummary: string
}

// Output JSON from Claude when user agrees to apply changes

export type CoachProposal = {
  habitId: string
  habitName: string
  adjustmentType: 'increase_difficulty' | 'decrease_difficulty' | 'shift_time' | 'change_cue' | 'no_change'
  currentValue: string
  proposedValue: string
  rationale: string
}
