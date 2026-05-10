import type {
  WeeklyAnalysis,
  HabitBreakdown,
  DayOfWeekStat,
  ProposedAdjustment,
  RawHabit,
  RawLog,
  RawSurvey,
  RawCalendarEvent,
} from './types'

export function computeWeeklyAnalysis(
  habits: RawHabit[],
  logs: RawLog[],
  surveys: RawSurvey[],
  calendarEvents: RawCalendarEvent[],
  weekOf: string,
): WeeklyAnalysis {
  const last7 = getLast7Dates(weekOf)
  const calDates = new Set(calendarEvents.map((e) => e.date))

  const habitBreakdown: HabitBreakdown[] = habits.map((h) =>
    computeHabitBreakdown(h, logs, surveys, last7, calDates)
  )

  const completedTotal = habitBreakdown.reduce((s, h) => s + h.completedDays, 0)
  const possibleTotal = habitBreakdown.reduce((s, h) => s + h.totalDays, 0)

  return {
    weekOf,
    overallCompletionRate: possibleTotal > 0 ? completedTotal / possibleTotal : 0,
    completedTotal,
    possibleTotal,
    habitBreakdown,
    dayOfWeekStats: computeDayStats(habits, logs, last7),
    proposedAdjustments: computeProposals(habitBreakdown, habits),
    hasSurveyData: surveys.length > 0,
    hasCalendarData: calendarEvents.length > 0,
  }
}

function computeHabitBreakdown(
  habit: RawHabit,
  logs: RawLog[],
  surveys: RawSurvey[],
  last7: string[],
  calDates: Set<string>,
): HabitBreakdown {
  const habitLogs = logs.filter((l) => l.habit_id === habit.id && last7.includes(l.date))
  const completedDays = habitLogs.filter((l) => l.completed).length
  const missedDates = last7.filter((d) => !habitLogs.find((l) => l.date === d && l.completed))

  const habitSurveys = surveys.filter((s) => s.habit_id === habit.id && last7.includes(s.date))
  const wentWrongs = habitSurveys
    .map((s) => s.went_wrong)
    .filter((w): w is string => !!w?.trim())
  const levels = habitSurveys
    .map((s) => s.completion_level)
    .filter((l): l is 'full' | 'partial' | 'none' => !!l)

  return {
    habitId: habit.id,
    habitName: habit.habit_name,
    completionRate: last7.length > 0 ? completedDays / last7.length : 0,
    completedDays,
    totalDays: last7.length,
    avgCompletionLevel: avgLevel(levels),
    commonWentWrong: topThemes(wentWrongs),
    calendarConflictDays: missedDates.filter((d) => calDates.has(d)).length,
  }
}

function avgLevel(levels: ('full' | 'partial' | 'none')[]): 'full' | 'partial' | 'none' | null {
  if (levels.length === 0) return null
  const score = { full: 1, partial: 0.5, none: 0 } as const
  const avg = levels.reduce((s, l) => s + score[l], 0) / levels.length
  return avg >= 0.75 ? 'full' : avg >= 0.35 ? 'partial' : 'none'
}

function topThemes(texts: string[]): string[] {
  const seen = new Set<string>()
  return texts
    .filter((t) => { const k = t.toLowerCase().slice(0, 60); return !seen.has(k) && !!seen.add(k) })
    .slice(0, 3)
    .map((t) => t.slice(0, 120))
}

function computeDayStats(habits: RawHabit[], logs: RawLog[], dates: string[]): DayOfWeekStat[] {
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const byDay: Record<string, { completed: number; total: number }> = {}

  for (const date of dates) {
    const day = DAYS[new Date(date + 'T12:00:00').getDay()]
    if (!byDay[day]) byDay[day] = { completed: 0, total: 0 }
    for (const habit of habits) {
      byDay[day].total++
      if (logs.find((l) => l.habit_id === habit.id && l.date === date && l.completed)) {
        byDay[day].completed++
      }
    }
  }

  return Object.entries(byDay).map(([day, { completed, total }]) => ({
    day,
    completionRate: total > 0 ? completed / total : 0,
    missedCount: total - completed,
  }))
}

function computeProposals(breakdown: HabitBreakdown[], habits: RawHabit[]): ProposedAdjustment[] {
  return breakdown.flatMap((h): ProposedAdjustment[] => {
    const habit = habits.find((r) => r.id === h.habitId)
    if (!habit) return []

    if (h.completionRate >= 0.85) return [{
      habitId: h.habitId, habitName: h.habitName, type: 'increase_difficulty',
      rationale: `${Math.round(h.completionRate * 100)}% completion — ready to level up`,
      currentValue: habit.habit_name,
      proposedValue: `a slightly harder version of "${habit.habit_name}"`,
    }]

    if (h.completionRate < 0.5 && h.calendarConflictDays >= 2) return [{
      habitId: h.habitId, habitName: h.habitName, type: 'shift_time',
      rationale: `${h.totalDays - h.completedDays} misses, ${h.calendarConflictDays} on days with calendar events`,
      currentValue: habit.time_of_day ?? habit.reminder_time ?? 'current time',
      proposedValue: 'a time with fewer calendar conflicts',
    }]

    if (h.completionRate < 0.4) return [{
      habitId: h.habitId, habitName: h.habitName, type: 'flag_for_discussion',
      rationale: `Only ${Math.round(h.completionRate * 100)}% completion this week`,
      currentValue: habit.habit_name, proposedValue: 'discuss with user',
    }]

    return []
  })
}

function getLast7Dates(weekOf: string): string[] {
  const dates: string[] = []
  const end = new Date(weekOf + 'T12:00:00')
  for (let i = 6; i >= 0; i--) {
    const d = new Date(end)
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}
