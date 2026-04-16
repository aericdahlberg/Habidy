import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ habits: data })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // ── Multi-habit path: { user_id, habits: [...], selectedProposedIds: [...] }
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
        }>
        selectedProposedIds?: string[]
      }

      if (!user_id || habits.length === 0) {
        return NextResponse.json({ error: 'user_id and habits required' }, { status: 400 })
      }

      const rows = habits.map((h) => ({
        user_id,
        name: h.habit_name ?? h.name ?? 'Unnamed habit',
        identity_link: h.identity_label ?? null,
        cue: h.cue ?? null,
        craving: null,
        action: null,
        reward: null,
        two_minute_version: h.two_minute_version ?? null,
        time_of_day: 'anytime',
        goal_category: h.category ?? h.goal_category ?? null,
        is_active: true,
      }))

      const { data: inserted, error: insertError } = await supabase
        .from('habits')
        .insert(rows)
        .select()

      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

      // Mark the selected proposed_habits rows
      if (selectedProposedIds && selectedProposedIds.length > 0) {
        await supabase
          .from('proposed_habits')
          .update({ selected: true })
          .in('id', selectedProposedIds)
      }

      return NextResponse.json({ habits: inserted })
    }

    // ── Single-habit path (backward compatible) ───────────────────────────────
    const {
      user_id,
      name,
      identity_link,
      cue,
      craving,
      action,
      reward,
      two_minute_version,
      time_of_day,
      goal_category,
    } = body

    if (!user_id || !name) {
      return NextResponse.json({ error: 'user_id and name required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('habits')
      .insert({
        user_id,
        name,
        identity_link: identity_link ?? null,
        cue: cue ?? null,
        craving: craving ?? null,
        action: action ?? null,
        reward: reward ?? null,
        two_minute_version: two_minute_version ?? null,
        time_of_day: time_of_day ?? 'anytime',
        goal_category: goal_category ?? null,
        is_active: true,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ habit: data })
  } catch (err) {
    console.error('[POST /api/habits]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
