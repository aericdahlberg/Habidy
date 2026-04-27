import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      identity_statement,
      goal_category,
      friction_point,
      time_available,
      user_id,
      email,
      profile_name,
    } = body

    if (!identity_statement) {
      return NextResponse.json({ error: 'identity_statement is required' }, { status: 400 })
    }

    const db = adminClient()

    const payload = {
      identity_statement,
      goal_category: goal_category ?? null,
      friction_point: friction_point ?? null,
      time_available: time_available ?? null,
      new_user: false,
      ...(email ? { email: String(email).toLowerCase() } : {}),
      ...(profile_name ? { display_name: profile_name, profile_name } : {}),
    }

    if (user_id) {
      const { data, error } = await db
        .from('users')
        .upsert({ id: user_id, ...payload })
        .select()
        .single()

      if (error) {
        console.error('[/api/onboarding] upsert error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ user: data })
    } else {
      const { data, error } = await db
        .from('users')
        .insert({ ...payload, new_user: true })
        .select()
        .single()

      if (error) {
        console.error('[/api/onboarding] insert error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ user: data })
    }
  } catch (err) {
    console.error('[/api/onboarding]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
