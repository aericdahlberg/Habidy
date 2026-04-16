import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { identity_statement, goal_category, friction_point, time_available, user_id, email, name } = body

    if (!identity_statement || !goal_category || !friction_point || !time_available) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Upsert user — if user_id provided update, otherwise create
    if (user_id) {
      const { data, error } = await supabase
        .from('users')
        .update({
          identity_statement,
          goal_category,
          friction_point,
          time_available,
          onboarding_done: true,
        })
        .eq('id', user_id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ user: data })
    } else {
      const { data, error } = await supabase
        .from('users')
        .insert({
          email: email ?? `anon-${Date.now()}@habidy.app`,
          name: name ?? null,
          identity_statement,
          goal_category,
          friction_point,
          time_available,
          onboarding_done: true,
          new_user: true,
        })
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ user: data })
    }
  } catch (err) {
    console.error('[/api/onboarding]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
