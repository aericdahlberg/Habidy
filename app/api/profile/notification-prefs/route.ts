import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase'
import { getRouteUser } from '@/lib/supabaseServer'
import { parseNotificationPrefs, DEFAULT_NOTIFICATION_PREFS } from '@/lib/notification-prefs'
import type { NotificationPrefs } from '@/lib/notification-prefs'
import { getValidAccessToken } from '@/lib/google-auth'
import { updateRecurringHabitEvent } from '@/lib/google-calendar'

export async function GET() {
  const user = await getRouteUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await adminClient()
    .from('users')
    .select('notification_prefs')
    .eq('id', user.id)
    .maybeSingle()

  return NextResponse.json({ prefs: parseNotificationPrefs(data?.notification_prefs) })
}

export async function PATCH(req: NextRequest) {
  const user = await getRouteUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as Partial<NotificationPrefs>

  // Validate minutes_before: Google Calendar accepts 0–40320 (4 weeks)
  if (Array.isArray(body.default_minutes_before)) {
    const invalid = body.default_minutes_before.some(
      (n) => typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > 40320
    )
    if (invalid) {
      return NextResponse.json(
        { error: 'default_minutes_before values must be integers between 0 and 40320' },
        { status: 400 },
      )
    }
  }

  const db = adminClient()

  // Read current prefs and merge
  const { data: userRow } = await db
    .from('users')
    .select('notification_prefs, google_calendar_connected, timezone')
    .eq('id', user.id)
    .maybeSingle()

  const current = parseNotificationPrefs(userRow?.notification_prefs)
  const merged: NotificationPrefs = {
    ...current,
    ...(typeof body.email_reminder_enabled === 'boolean' && { email_reminder_enabled: body.email_reminder_enabled }),
    ...(typeof body.auto_dismiss_when_logged === 'boolean' && { auto_dismiss_when_logged: body.auto_dismiss_when_logged }),
    ...(Array.isArray(body.default_minutes_before) && { default_minutes_before: body.default_minutes_before }),
  }

  const { error } = await db
    .from('users')
    .update({ notification_prefs: merged })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Propagate reminder changes to Google Calendar for habits that inherit the global default
  let propagated = 0
  const minutesChanged =
    JSON.stringify(merged.default_minutes_before) !== JSON.stringify(current.default_minutes_before) ||
    merged.email_reminder_enabled !== current.email_reminder_enabled

  if (minutesChanged && userRow?.google_calendar_connected) {
    const accessToken = await getValidAccessToken(user.id)
    if (accessToken) {
      const { data: habits } = await db
        .from('habits')
        .select('id, google_calendar_event_id, habit_name, cue, two_minute_version, category, identity_label, reminder_time, reminder_minutes_before')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('reminder_enabled', true)
        .not('google_calendar_event_id', 'is', null)

      const tz = (userRow.timezone as string | null) ?? 'America/New_York'
      const updates = (habits ?? [])
        .filter((h) => !(h.reminder_minutes_before as number[] | null))  // only those inheriting default
        .map((h) =>
          updateRecurringHabitEvent(accessToken, h.google_calendar_event_id as string, {
            habitName: h.habit_name as string,
            cue: (h.cue as string) ?? '',
            twoMinuteVersion: (h.two_minute_version as string) ?? '',
            suggestedTime: (h.reminder_time as string) ?? 'morning',
            userTimezone: tz,
            identityLabel: (h.identity_label as string) ?? undefined,
            category: (h.category as string) ?? undefined,
            reminderMinutesBefore: merged.default_minutes_before,
            emailReminderEnabled: merged.email_reminder_enabled,
          }).then(() => { propagated++ }).catch(() => { /* log later */ }),
        )
      await Promise.allSettled(updates)
    }
  }

  return NextResponse.json({ prefs: merged, propagated })
}
