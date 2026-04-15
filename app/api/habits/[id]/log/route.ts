import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: habitId } = await params
    const body = await req.json()
    const { user_id, completed, date } = body

    if (!user_id || completed === undefined) {
      return NextResponse.json({ error: 'user_id and completed required' }, { status: 400 })
    }

    const logDate = date ?? new Date().toISOString().split('T')[0]

    // Check if already logged today
    const { data: existing } = await supabase
      .from('habit_logs')
      .select('id')
      .eq('habit_id', habitId)
      .eq('user_id', user_id)
      .eq('date', logDate)
      .single()

    if (existing) {
      // Update existing log
      const { data, error } = await supabase
        .from('habit_logs')
        .update({ completed })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ log: data, updated: true })
    }

    const { data, error } = await supabase
      .from('habit_logs')
      .insert({ habit_id: habitId, user_id, date: logDate, completed })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ log: data, updated: false })
  } catch (err) {
    console.error('[POST /api/habits/[id]/log]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
