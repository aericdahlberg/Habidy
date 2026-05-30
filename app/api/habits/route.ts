import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase'
import { getRouteUser } from '@/lib/supabaseServer'
import { calculateStreak, getPhase } from '@/lib/streak'

export async function GET(req: NextRequest) {
  const user = await getRouteUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const requestedUserId = req.nextUrl.searchParams.get('user_id')
  if (requestedUserId && requestedUserId !== user.id) {
    return NextResponse.json({ error: 'Cannot read habits for another user' }, { status: 403 })
  }

  const { data, error } = await adminClient()
    .from('habits')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[GET /api/habits]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const since = new Date()
  since.setDate(since.getDate() - 60)
  const sinceStr = since.toISOString().split('T')[0]

  const { data: logs } = await adminClient()
    .from('habit_logs')
    .select('habit_id, date, completed')
    .in('habit_id', (data ?? []).map((h) => h.id))
    .gte('date', sinceStr)
    .order('date', { ascending: false })

  const byHabit: Record<string, { date: string; completed: boolean }[]> = {}
  for (const log of logs ?? []) {
    if (!byHabit[log.habit_id]) byHabit[log.habit_id] = []
    byHabit[log.habit_id].push({ date: log.date as string, completed: log.completed as boolean })
  }

  const enriched = (data ?? []).map((h) => {
    const streak = calculateStreak(byHabit[h.id] ?? [])
    return { ...h, ...getPhase(streak) }
  })

  return NextResponse.json({ habits: enriched })
}

export async function POST(req: NextRequest) {
  try {
    const user = await getRouteUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await req.json()
    const bodyUserId = typeof body.user_id === 'string' ? body.user_id : null
    if (bodyUserId && bodyUserId !== user.id) {
      return NextResponse.json({ error: 'Cannot create habits for another user' }, { status: 403 })
    }

    // ── Multi-habit path ──────────────────────────────────────────────────────
    if (body.habits && Array.isArray(body.habits)) {
      const { habits, selectedProposedIds } = body as {
        user_id?: string
        habits: Array<{
          identity_label?: string
          habit_name?: string
          name?: string
          cue?: string
          two_minute_version?: string
          category?: string
          goal_category?: string
          action?: string
          craving?: string
          reward?: string
          time_of_day?: string
          suggested_time?: string
        }>
        selectedProposedIds?: string[]
      }

      if (habits.length === 0) {
        return NextResponse.json({ error: 'habits required' }, { status: 400 })
      }

      const rows = habits.map((h) => ({
        user_id: user.id,
        habit_name: h.habit_name ?? h.name ?? 'Unnamed habit',
        identity_label: h.identity_label ?? null,
        cue: h.cue ?? null,
        two_minute_version: h.two_minute_version ?? null,
        category: h.category ?? h.goal_category ?? null,
        action: h.action ?? null,
        craving: h.craving ?? null,
        reward: h.reward ?? null,
        time_of_day: h.time_of_day ?? 'anytime',
        reminder_time: h.suggested_time ?? null,
        is_active: true,
      }))

      const { data: inserted, error: insertError } = await adminClient()
        .from('habits')
        .insert(rows)
        .select()

      if (insertError) {
        console.error('[POST /api/habits] insert error:', insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      if (selectedProposedIds && selectedProposedIds.length > 0) {
        await adminClient()
          .from('proposed_habits')
          .update({ selected: true })
          .in('id', selectedProposedIds)
          .eq('user_id', user.id)
      }

      return NextResponse.json({ habits: inserted })
    }

    // ── Single-habit path ─────────────────────────────────────────────────────
    const {
      habit_name, name, identity_label, cue, two_minute_version,
      category, goal_category, action, craving, reward, time_of_day,
    } = body

    if (!(habit_name ?? name)) {
      return NextResponse.json({ error: 'habit_name required' }, { status: 400 })
    }

    const { data, error } = await adminClient()
      .from('habits')
      .insert({
        user_id: user.id,
        habit_name: habit_name ?? name,
        identity_label: identity_label ?? null,
        cue: cue ?? null,
        two_minute_version: two_minute_version ?? null,
        category: category ?? goal_category ?? null,
        action: action ?? null,
        craving: craving ?? null,
        reward: reward ?? null,
        time_of_day: time_of_day ?? 'anytime',
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('[POST /api/habits] single insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ habit: data })
  } catch (err) {
    console.error('[POST /api/habits]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
