import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase'

const supabase = adminClient()

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[GET /api/habits]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ habits: data })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // ── Multi-habit path ──────────────────────────────────────────────────────
    if (body.habits && Array.isArray(body.habits)) {
      const { user_id, habits, selectedProposedIds } = body as {
        user_id: string
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
        }>
        selectedProposedIds?: string[]
      }

      if (!user_id || habits.length === 0) {
        return NextResponse.json({ error: 'user_id and habits required' }, { status: 400 })
      }

      const rows = habits.map((h) => ({
        user_id,
        habit_name: h.habit_name ?? h.name ?? 'Unnamed habit',
        identity_label: h.identity_label ?? null,
        cue: h.cue ?? null,
        two_minute_version: h.two_minute_version ?? null,
        category: h.category ?? h.goal_category ?? null,
        action: h.action ?? null,
        craving: h.craving ?? null,
        reward: h.reward ?? null,
        time_of_day: h.time_of_day ?? 'anytime',
        is_active: true,
      }))

      const { data: inserted, error: insertError } = await supabase
        .from('habits')
        .insert(rows)
        .select()

      if (insertError) {
        console.error('[POST /api/habits] insert error:', insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      if (selectedProposedIds && selectedProposedIds.length > 0) {
        await supabase
          .from('proposed_habits')
          .update({ selected: true })
          .in('id', selectedProposedIds)
      }

      return NextResponse.json({ habits: inserted })
    }

    // ── Single-habit path ─────────────────────────────────────────────────────
    const {
      user_id, habit_name, name, identity_label, cue, two_minute_version,
      category, goal_category, action, craving, reward, time_of_day,
    } = body

    if (!user_id || !(habit_name ?? name)) {
      return NextResponse.json({ error: 'user_id and habit_name required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('habits')
      .insert({
        user_id,
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
