import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase'
import { getRouteUser } from '@/lib/supabaseServer'
import { dismissTodayReminder } from '@/lib/calendar-dismiss'

function localDateInTz(tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date())
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getRouteUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id: habitId } = await params
    const body = await req.json()
    const { user_id, completed, date } = body

    if (user_id && user_id !== user.id) {
      return NextResponse.json({ error: 'Cannot log habits for another user' }, { status: 403 })
    }

    if (completed === undefined) {
      return NextResponse.json({ error: 'completed required' }, { status: 400 })
    }

    const db = adminClient()

    // Prefer client-supplied date (local timezone). If missing, fall back to
    // user's stored timezone, then UTC. Clients should always send date via localDateStr().
    let logDate: string = date
    if (!logDate) {
      const { data: userRow } = await db
        .from('users')
        .select('timezone')
        .eq('id', user.id)
        .maybeSingle()
      const tz = (userRow?.timezone as string | null) ?? 'UTC'
      logDate = localDateInTz(tz)
    }

    const { data: habit, error: habitError } = await db
      .from('habits')
      .select('id')
      .eq('id', habitId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (habitError) return NextResponse.json({ error: habitError.message }, { status: 500 })
    if (!habit) return NextResponse.json({ error: 'Habit not found' }, { status: 404 })

    // Check if already logged today
    const { data: existing } = await db
      .from('habit_logs')
      .select('id')
      .eq('habit_id', habitId)
      .eq('user_id', user.id)
      .eq('date', logDate)
      .maybeSingle()

    if (existing) {
      // Update existing log
      const { data, error } = await db
        .from('habit_logs')
        .update({ completed })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (completed) void dismissTodayReminder({ userId: user.id, habitId, logDate })
      return NextResponse.json({ log: data, updated: true })
    }

    const { data, error } = await db
      .from('habit_logs')
      .insert({ habit_id: habitId, user_id: user.id, date: logDate, completed })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (completed) void dismissTodayReminder({ userId: user.id, habitId, logDate })
    return NextResponse.json({ log: data, updated: false })
  } catch (err) {
    console.error('[POST /api/habits/[id]/log]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
