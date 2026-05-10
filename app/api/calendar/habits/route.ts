import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase'
import { getRouteUser } from '@/lib/supabaseServer'
import { getValidAccessToken } from '@/lib/google-auth'
import { createRecurringHabitEvent } from '@/lib/google-calendar'

export async function POST(req: NextRequest) {
  const user = await getRouteUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    habitName?: string
    cue?: string
    twoMinuteVersion?: string
    suggestedTime?: string
    userTimezone?: string
    identityLabel?: string
    category?: string
    habitId?: string
  }
  const { habitName, cue, twoMinuteVersion, suggestedTime, userTimezone, identityLabel, category, habitId } = body

  if (!habitName || !cue) {
    return NextResponse.json({ error: 'habitName and cue are required' }, { status: 400 })
  }

  // Resolve reminder prefs: per-habit override → global default
  const db = adminClient()
  let reminderMinutesBefore: number[] | undefined
  if (habitId) {
    const { data: habitRow } = await db
      .from('habits')
      .select('reminder_minutes_before')
      .eq('id', habitId)
      .eq('user_id', user.id)
      .maybeSingle()
    reminderMinutesBefore = (habitRow?.reminder_minutes_before as number[] | null) ?? undefined
  }
  if (!reminderMinutesBefore) {
    const { data: userRow } = await db
      .from('users')
      .select('notification_prefs')
      .eq('id', user.id)
      .maybeSingle()
    const prefs = (userRow?.notification_prefs ?? {}) as { default_minutes_before?: number[]; email_reminder_enabled?: boolean }
    reminderMinutesBefore = prefs.default_minutes_before ?? [15, 0]
  }

  const accessToken = await getValidAccessToken(user.id)
  if (!accessToken) return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 403 })

  try {
    const eventId = await createRecurringHabitEvent(accessToken, {
      habitName,
      cue,
      twoMinuteVersion: twoMinuteVersion ?? '',
      suggestedTime: suggestedTime ?? 'morning',
      userTimezone: userTimezone ?? 'America/New_York',
      identityLabel: identityLabel ?? undefined,
      category: category ?? undefined,
      reminderMinutesBefore,
    })

    // Persist event ID on the habit row so we can patch/dismiss later
    if (habitId) {
      await db
        .from('habits')
        .update({ google_calendar_event_id: eventId })
        .eq('id', habitId)
        .eq('user_id', user.id)
    }

    return NextResponse.json({ eventId })
  } catch (err) {
    console.error('[POST /api/calendar/habits]', err)
    return NextResponse.json({ error: 'Failed to create calendar event' }, { status: 500 })
  }
}