import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase'

const supabase = adminClient()
import { calculateStreak, getLast7Days } from '@/lib/streak'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: habitId } = await params
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('habit_logs')
    .select('date, completed')
    .eq('habit_id', habitId)
    .eq('user_id', userId)
    .order('date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const logs = (data ?? []).map((l) => ({ date: l.date as string, completed: l.completed as boolean }))
  const streak = calculateStreak(logs)
  const last7 = getLast7Days(logs)

  return NextResponse.json({ streak, last7 })
}
