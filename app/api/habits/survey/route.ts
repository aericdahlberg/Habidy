import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase'
import { getRouteUser } from '@/lib/supabaseServer'

export async function POST(req: NextRequest) {
  try {
    const user = await getRouteUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await req.json()
    const { userId, habitId, date, wentRight, wentWrong, completionLevel } = body as {
      userId?: string
      habitId?: string
      date?: string
      wentRight?: string | null
      wentWrong?: string | null
      completionLevel?: 'full' | 'partial' | 'none'
    }

    if (userId && userId !== user.id) {
      return NextResponse.json({ error: 'Cannot save surveys for another user' }, { status: 403 })
    }

    if (!habitId || !date || !completionLevel) {
      return NextResponse.json(
        { error: 'habitId, date, and completionLevel are required' },
        { status: 400 },
      )
    }

    const db = adminClient()
    const { data: habit, error: habitError } = await db
      .from('habits')
      .select('id')
      .eq('id', habitId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (habitError) return NextResponse.json({ error: habitError.message }, { status: 500 })
    if (!habit) return NextResponse.json({ error: 'Habit not found' }, { status: 404 })

    const { data, error } = await db
      .from('habit_survey_responses')
      .insert({
        user_id: user.id,
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
