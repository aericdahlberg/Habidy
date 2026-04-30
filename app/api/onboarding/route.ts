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

    const allBlockers = Array.isArray(questionnaire?.blockers)
      ? questionnaire.blockers.join('; ')
      : (friction_point ?? null)

    const displayName = profile_name ?? null
    const normalizedEmail = email ? String(email).toLowerCase() : null

    console.log('[/api/onboarding] saving core fields:', {
      identity_statement,
      goal_category: goal_category ?? null,
      friction_point: allBlockers,
      time_available: time_available ?? null,
      user_id: user_id ?? null,
    })

    const db = adminClient()

    // ── Step 1: save core identity fields (these columns always exist) ────────
    const corePayload = {
      identity_statement,
      goal_category: goal_category ?? null,
      friction_point: allBlockers,
      time_available: time_available ?? null,
      new_user: false,
    }

    let savedData: Record<string, unknown> | null = null

    if (user_id) {
      // Explicit conflict target prevents duplicate inserts
      const { data, error } = await db
        .from('users')
        .upsert({ id: user_id, ...corePayload }, { onConflict: 'id' })
        .select()
        .single()

      if (error) {
        console.error('[/api/onboarding] core upsert error:', error.message, error.code)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      savedData = data as Record<string, unknown>
    } else {
      // This path should never be reached now that the loading page retries auth
      console.warn('[/api/onboarding] called without user_id — creating anonymous row')
      const { data, error } = await db
        .from('users')
        .insert({ ...corePayload, new_user: true })
        .select()
        .single()

      if (error) {
        console.error('[/api/onboarding] core insert error:', error.message, error.code)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      savedData = data as Record<string, unknown>
    }

    const savedId = (savedData?.id as string) ?? user_id

    // ── Step 2: save social columns (added by social.sql — non-fatal if missing) ──
    if (savedId && (displayName || normalizedEmail)) {
      const socialPayload: Record<string, string> = {}
      if (displayName) {
        socialPayload.display_name = displayName
      }
      if (normalizedEmail) socialPayload.email = normalizedEmail

      const { error: socialError } = await db
        .from('users')
        .update(socialPayload)
        .eq('id', savedId)

      if (socialError) {
        // Non-fatal — social.sql may not have been run yet
        console.warn('[/api/onboarding] social column update skipped (run social.sql):', socialError.code, socialError.message)
      } else {
        console.log('[/api/onboarding] social fields saved:', socialPayload)
      }
    }

    console.log('[/api/onboarding] core row saved:', {
      id: savedData?.id,
      identity_statement: savedData?.identity_statement,
      goal_category: savedData?.goal_category,
      friction_point: savedData?.friction_point,
      time_available: savedData?.time_available,
    })

    return NextResponse.json({ user: savedData })
  } catch (err) {
    console.error('[/api/onboarding] unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
