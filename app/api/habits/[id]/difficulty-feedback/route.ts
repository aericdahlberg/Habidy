import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase'
import { getRouteUser } from '@/lib/supabaseServer'

type Rating = 'too_easy' | 'just_right' | 'too_hard'
type Action = 'level_up' | 'keep' | 'scale_down'

function ratingToAction(rating: Rating): Action {
  if (rating === 'too_easy') return 'level_up'
  if (rating === 'too_hard') return 'scale_down'
  return 'keep'
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: habitId } = await params
  const user = await getRouteUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { rating?: string }
  const rating = body.rating as Rating | undefined
  if (!rating || !['too_easy', 'just_right', 'too_hard'].includes(rating)) {
    return NextResponse.json({ error: 'rating must be too_easy | just_right | too_hard' }, { status: 400 })
  }

  const db = adminClient()

  const { data: habit, error: habitErr } = await db
    .from('habits')
    .select('id, difficulty_level')
    .eq('id', habitId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (habitErr) return NextResponse.json({ error: habitErr.message }, { status: 500 })
  if (!habit) return NextResponse.json({ error: 'Habit not found' }, { status: 404 })

  const currentLevel = (habit.difficulty_level as number) ?? 1
  const newLevel =
    rating === 'too_easy' ? Math.min(currentLevel + 1, 5) :
    rating === 'too_hard' ? Math.max(currentLevel - 1, 1) :
    currentLevel

  const [logErr, updateErr] = await Promise.all([
    db.from('habit_difficulty_logs').insert({
      user_id: user.id,
      habit_id: habitId,
      rating,
      difficulty_level_before: currentLevel,
    }).then(({ error }) => error),
    db.from('habits').update({
      last_rated_at: new Date().toISOString(),
      difficulty_level: newLevel,
    }).eq('id', habitId).eq('user_id', user.id).then(({ error }) => error),
  ])

  if (logErr) console.error('[POST difficulty-feedback] log insert:', logErr)
  if (updateErr) console.error('[POST difficulty-feedback] habit update:', updateErr)
  if (logErr || updateErr) {
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
  }

  return NextResponse.json({ action: ratingToAction(rating) })
}
