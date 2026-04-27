import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase'
import { getRouteUser } from '@/lib/supabaseServer'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getRouteUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id: habitId } = await params
    const body = await req.json()
    const { user_id, completed, date } = body

    if (user_id && user_id !== user.id) {
      return NextResponse.json({ error: 'Cannot log habits for another user' }, { status: 403 })
    }

    if (completed === undefined) {
      return NextResponse.json({ error: 'completed required' }, { status: 400 })
    }

    const logDate = date ?? new Date().toISOString().split('T')[0]
    const db = adminClient()

    const { data: habit, error: habitError } = await db
      .from('habits')
      .select('id')
      .eq('id', habitId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (habitError) return NextResponse.json({ error: habitError.message }, { status: 500 })
    if (!habit) return NextResponse.json({ error: 'Habit not found' }, { status: 404 })

    // Check if already logged today
    const { data: existing } = await db
      .from('habit_logs')
      .select('id')
      .eq('habit_id', habitId)
      .eq('user_id', user.id)
      .eq('date', logDate)
      .maybeSingle()

    if (existing) {
      // Update existing log
      const { data, error } = await db
        .from('habit_logs')
        .update({ completed })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ log: data, updated: true })
    }

    const { data, error } = await db
      .from('habit_logs')
      .insert({ habit_id: habitId, user_id: user.id, date: logDate, completed })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ log: data, updated: false })
  } catch (err) {
    console.error('[POST /api/habits/[id]/log]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
