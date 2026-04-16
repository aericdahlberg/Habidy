import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, habitId, date, wentRight, wentWrong, completionLevel } = body as {
      userId?: string
      habitId?: string
      date?: string
      wentRight?: string | null
      wentWrong?: string | null
      completionLevel?: 'full' | 'partial' | 'none'
    }

    if (!userId || !habitId || !date || !completionLevel) {
      return NextResponse.json(
        { error: 'userId, habitId, date, and completionLevel are required' },
        { status: 400 },
      )
    }

    const { data, error } = await adminClient()
      .from('habit_survey_responses')
      .insert({
        user_id: userId,
        habit_id: habitId,
        date,
        went_right: wentRight ?? null,
        went_wrong: wentWrong ?? null,
        completion_level: completionLevel,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ survey: data })
  } catch (err) {
    console.error('[POST /api/habits/survey]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
