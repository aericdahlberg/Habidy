import { adminClient } from '@/lib/supabase'
import { getValidAccessToken } from '@/lib/google-auth'
import { suppressEventInstance } from '@/lib/google-calendar'
import { writeLog } from '@/lib/logger'
import { parseNotificationPrefs } from '@/lib/notification-prefs'

type DismissArgs = {
  userId: string
  habitId: string
  logDate: string  // YYYY-MM-DD in the user's local timezone
}

// Fire-and-forget: removes today's Google Calendar reminder popup for a habit
// after the user marks it complete. Failures are logged but never thrown —
// the habit log response must always succeed.
export async function dismissTodayReminder({ userId, habitId, logDate }: DismissArgs): Promise<void> {
  try {
    const db = adminClient()

    // Single query: join user prefs + habit calendar data
    const { data: habitRow } = await db
      .from('habits')
      .select('google_calendar_event_id, reminder_enabled')
      .eq('id', habitId)
      .eq('user_id', userId)
      .maybeSingle()

    if (!habitRow?.google_calendar_event_id || !habitRow?.reminder_enabled) return

    const { data: userRow } = await db
      .from('users')
      .select('notification_prefs, timezone, google_calendar_connected')
      .eq('id', userId)
      .maybeSingle()

    if (!userRow?.google_calendar_connected) return

    const prefs = parseNotificationPrefs(userRow.notification_prefs)
    if (!prefs.auto_dismiss_when_logged) return

    const accessToken = await getValidAccessToken(userId)
    if (!accessToken) return

    const tz = (userRow.timezone as string | null) ?? 'America/New_York'

    await suppressEventInstance(
      accessToken,
      habitRow.google_calendar_event_id as string,
      logDate,
      tz,
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)

    // Event was deleted in Google — clean up the stale reference
    if (msg === 'EVENT_DELETED') {
      await adminClient()
        .from('habits')
        .update({ google_calendar_event_id: null })
        .eq('id', habitId)
        .eq('user_id', userId)
        .then(() => { /* ignore */ })
      return
    }

    void writeLog({
      userId,
      agent: 'calendar',
      toolName: 'dismiss_today',
      input: { habitId, logDate },
      output: null,
      success: false,
      error: msg,
      durationMs: 0,
    })
  }
}
