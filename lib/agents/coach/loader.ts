import { adminClient, getProfileContext } from '@/lib/supabase'
import { getValidAccessToken } from '@/lib/google-auth'
import { getCalendarEvents, formatEventsForContext } from '@/lib/google-calendar'
import { computeWeeklyAnalysis } from './analysis'
import type { WeeklyAnalysis, RawHabit, RawLog, RawSurvey, RawCalendarEvent } from './types'

export type CoachLoaderResult = {
  userName: string
  identityStatement: string
  weeklyAnalysis: WeeklyAnalysis | null
  profileContext: string | null
  calendarContext: string | null
  priorAdjustmentsSummary: string
}

export async function loadCoachContext(userId: string): Promise<CoachLoaderResult> {
  const supabase = adminClient()

  const { data: userRow } = await supabase
    .from('users')
    .select('display_name, identity_statement')
    .eq('id', userId)
    .maybeSingle()

  const [profileContext, weeklyAnalysis, calendarContext, priorAdjustmentsSummary] =
    await Promise.allSettled([
      loadProfileContext(userId),
      loadWeeklyAnalysis(userId),
      loadCalendarContext(userId),
      loadPriorAdjustments(userId),
    ]).then((results) =>
      results.map((r) => (r.status === 'fulfilled' ? r.value : null))
    )

  return {
    userName: (userRow?.display_name as string) ?? 'Friend',
    identityStatement: (userRow?.identity_statement as string) ?? '',
    weeklyAnalysis: weeklyAnalysis as WeeklyAnalysis | null,
    profileContext: profileContext as string | null,
    calendarContext: calendarContext as string | null,
    priorAdjustmentsSummary: (priorAdjustmentsSummary as string) ?? '',
  }
}

async function loadProfileContext(userId: string): Promise<string | null> {
  return getProfileContext(userId)
}

async function loadCalendarContext(userId: string): Promise<string | null> {
  const token = await getValidAccessToken(userId)
  if (!token) return null
  const now = new Date()
  const twoWeeks = new Date(now.getTime() + 14 * 86400000)
  const events = await getCalendarEvents(token, now, twoWeeks)
  return formatEventsForContext(events)
}

async function loadPriorAdjustments(userId: string): Promise<string> {
  const supabase = adminClient()
  const { data } = await supabase
    .from('habit_adjustments')
    .select('adjustment_type, proposed_value')
    .eq('user_id', userId)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false })
    .limit(5)

  if (!data?.length) return ''
  return data
    .map((a) => `${a.adjustment_type}: ${JSON.stringify(a.proposed_value)}`)
    .join(', ')
}

export async function loadWeeklyAnalysis(userId: string): Promise<WeeklyAnalysis | null> {
  const supabase = adminClient()

  const habitsRes = await supabase
    .from('habits')
    .select('id, habit_name, cue, time_of_day, reminder_time')
    .eq('user_id', userId)
    .eq('is_active', true)

  const habits: RawHabit[] = habitsRes.data ?? []
  if (habits.length === 0) return null

  const since = new Date()
  since.setDate(since.getDate() - 6)
  const weekOf = new Date().toISOString().split('T')[0]
  const sinceStr = since.toISOString().split('T')[0]
  const habitIds = habits.map((h) => h.id)

  const [logsRes, surveysRes] = await Promise.all([
    supabase
      .from('habit_logs')
      .select('habit_id, date, completed')
      .in('habit_id', habitIds)
      .gte('date', sinceStr),
    supabase
      .from('habit_survey_responses')
      .select('habit_id, date, went_wrong, completion_level')
      .eq('user_id', userId)
      .gte('date', sinceStr),
  ])

  let calEvents: RawCalendarEvent[] = []
  try {
    const token = await getValidAccessToken(userId)
    if (token) {
      const end = new Date()
      end.setDate(end.getDate() + 7)
      const events = await getCalendarEvents(token, since, end)
      calEvents = events
        .map((e) => ({ date: e.startTime.split('T')[0] }))
        .filter((e) => !!e.date)
    }
  } catch { /* non-fatal */ }

  return computeWeeklyAnalysis(
    habits,
    (logsRes.data as RawLog[]) ?? [],
    (surveysRes.data as RawSurvey[]) ?? [],
    calEvents,
    weekOf,
  )
}
