import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase'

const supabase = adminClient()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { identity_statement, goal_category, friction_point, time_available, user_id } = body

    if (!identity_statement || !goal_category || !friction_point || !time_available) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (user_id) {
      const { data, error } = await supabase
        .from('users')
        .upsert({
          id: user_id,
          identity_statement,
          goal_category,
          friction_point,
          time_available,
          new_user: false,
        })
        .select()
        .single()

      if (error) {
        console.error('[/api/onboarding] upsert error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ user: data })
    } else {
      const { data, error } = await supabase
        .from('users')
        .insert({
          identity_statement,
          goal_category,
          friction_point,
          time_available,
          new_user: true,
        })
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
