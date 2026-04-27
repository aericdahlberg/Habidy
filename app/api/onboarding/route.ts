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
      questionnaire,
    } = body

    if (!identity_statement) {
      return NextResponse.json({ error: 'identity_statement is required' }, { status: 400 })
    }

    // All blockers joined — richer than just the first one
    const allBlockers = Array.isArray(questionnaire?.blockers)
      ? questionnaire.blockers.join('; ')
      : friction_point

    console.log('[/api/onboarding] saving:', {
      identity_statement,
      goal_category,
      friction_point: allBlockers || friction_point,
      time_available,
      display_name: profile_name ?? null,
      email: email ? String(email).toLowerCase() : null,
      has_questionnaire: !!questionnaire,
    })

    const db = adminClient()

    const payload = {
      identity_statement,
      goal_category: goal_category ?? null,
      friction_point: allBlockers || friction_point || null,
      time_available: time_available ?? null,
      new_user: false,
      ...(email ? { email: String(email).toLowerCase() } : {}),
      ...(profile_name ? { display_name: profile_name, profile_name } : {}),
    }

    let savedData: Record<string, unknown> | null = null

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
      savedData = data as Record<string, unknown>
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
      savedData = data as Record<string, unknown>
    }

    // Verify what was actually written
    console.log('[/api/onboarding] verified saved row:', {
      id: savedData?.id,
      identity_statement: savedData?.identity_statement,
      goal_category: savedData?.goal_category,
      friction_point: savedData?.friction_point,
      time_available: savedData?.time_available,
      display_name: savedData?.display_name,
      new_user: savedData?.new_user,
    })

    return NextResponse.json({ user: savedData })
  } catch (err) {
    console.error('[/api/onboarding]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
