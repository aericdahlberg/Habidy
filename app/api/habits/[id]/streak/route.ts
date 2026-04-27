import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase'
import { getRouteUser } from '@/lib/supabaseServer'
import { calculateStreak, getLast7Days } from '@/lib/streak'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: habitId } = await params
  const user = await getRouteUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const requestedUserId = req.nextUrl.searchParams.get('user_id')
  if (requestedUserId && requestedUserId !== user.id) {
    return NextResponse.json({ error: 'Cannot read streaks for another user' }, { status: 403 })
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
    .from('habit_logs')
    .select('date, completed')
    .eq('habit_id', habitId)
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const logs = (data ?? []).map((l) => ({ date: l.date as string, completed: l.completed as boolean }))
  const streak = calculateStreak(logs)
  const last7 = getLast7Days(logs)

  return NextResponse.json({ streak, last7 })
}
