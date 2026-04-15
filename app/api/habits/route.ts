import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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
