import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase'
import { getRouteUser } from '@/lib/supabaseServer'
import { getValidAccessToken } from '@/lib/google-auth'
import { updateRecurringHabitEvent } from '@/lib/google-calendar'
import { parseNotificationPrefs } from '@/lib/notification-prefs'

const VALID_REMINDER_TIMES = new Set(['morning', 'midday', 'afternoon', 'evening', 'late_night'])

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ habitId: string }> },
) {
  const user = await getRouteUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { habitId } = await params
  const body = await req.json() as {
    reminder_enabled?: boolean
    reminder_minutes_before?: number[] | null
    reminder_time?: string | null
  }

  const db = adminClient()

  const { data: habitRow, error: habitErr } = await db
    .from('habits')
    .select('id, google_calendar_event_id, habit_name, cue, two_minute_version, category, identity_label, reminder_time, reminder_minutes_before, reminder_enabled')
    .eq('id', habitId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (habitErr) return NextResponse.json({ error: habitErr.message }, { status: 500 })
  if (!habitRow) return NextResponse.json({ error: 'Habit not found' }, { status: 404 })

  // Validate inputs
  if (body.reminder_time !== undefined && body.reminder_time !== null && !VALID_REMINDER_TIMES.has(body.reminder_time)) {
    return NextResponse.json({ error: 'Invalid reminder_time' }, { status: 400 })
  }
  if (body.reminder_minutes_before !== undefined && body.reminder_minutes_before !== null) {
    if (!Array.isArray(body.reminder_minutes_before) || body.reminder_minutes_before.some((n) => typeof n !== 'number')) {
      return NextResponse.json({ error: 'Invalid reminder_minutes_before' }, { status: 400 })
    }
  }

  const updates: Record<string, unknown> = {}
  if (typeof body.reminder_enabled === 'boolean') updates.reminder_enabled = body.reminder_enabled
  if (body.reminder_minutes_before !== undefined) updates.reminder_minutes_before = body.reminder_minutes_before
  if (body.reminder_time !== undefined) updates.reminder_time = body.reminder_time

  const { data: updated, error: updateErr } = await db
    .from('habits')
    .update(updates)
    .eq('id', habitId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Propagate to Google Calendar if the event exists
  const eventId = habitRow.google_calendar_event_id as string | null
  if (eventId) {
    const accessToken = await getValidAccessToken(user.id)
    if (accessToken) {
      // Single users query — fetch prefs + timezone together
      const { data: userRow } = await db
        .from('users')
        .select('notification_prefs, timezone')
        .eq('id', user.id)
        .maybeSingle()

      const tz = (userRow?.timezone as string | null) ?? 'America/New_York'

      // Resolve reminder minutes: new per-habit value → existing per-habit → global default
      let minutesBefore = (body.reminder_minutes_before ?? habitRow.reminder_minutes_before) as number[] | null
      let emailEnabled = false
      if (!minutesBefore) {
        const prefs = parseNotificationPrefs(userRow?.notification_prefs)
        minutesBefore = prefs.default_minutes_before
        emailEnabled = prefs.email_reminder_enabled
      }

      const reminderEnabled = typeof body.reminder_enabled === 'boolean'
        ? body.reminder_enabled
        : (habitRow.reminder_enabled as boolean)

      await updateRecurringHabitEvent(accessToken, eventId, {
        habitName: habitRow.habit_name as string,
        cue: (habitRow.cue as string) ?? '',
        twoMinuteVersion: (habitRow.two_minute_version as string) ?? '',
        suggestedTime: (body.reminder_time ?? habitRow.reminder_time ?? 'morning') as string,
        userTimezone: tz,
        identityLabel: (habitRow.identity_label as string) ?? undefined,
        category: (habitRow.category as string) ?? undefined,
        reminderMinutesBefore: reminderEnabled ? (minutesBefore ?? [15, 0]) : [],
        emailReminderEnabled: reminderEnabled ? emailEnabled : false,
      }).catch(() => { /* non-critical — user can retry */ })
    }
  }

  return NextResponse.json({ habit: updated })
}
