import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })

  const db = adminClient()
  const today = new Date().toISOString().split('T')[0]

  try {
    // All friendships involving this user (accepted)
    const { data: friendships, error: fsError } = await db
      .from('friendships')
      .select('id, user_id, friend_id')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq('status', 'accepted')

    if (fsError) throw fsError

    const friendIds = (friendships ?? []).map((f) =>
      f.user_id === userId ? f.friend_id : f.user_id
    )

    // Batch-fetch friend profiles
    const { data: profiles } = friendIds.length
      ? await db.from('users').select('id, display_name, avatar_url').in('id', friendIds)
      : { data: [] }

    const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))

    // Batch-fetch all active habits for all friends
    const { data: allHabits } = friendIds.length
      ? await db.from('habits').select('id, user_id').in('user_id', friendIds).eq('is_active', true)
      : { data: [] }

    const habitsByUser: Record<string, string[]> = {}
    for (const h of allHabits ?? []) {
      if (!habitsByUser[h.user_id]) habitsByUser[h.user_id] = []
      habitsByUser[h.user_id].push(h.id)
    }

    // Batch-fetch today's logs for all those habits
    const allHabitIds = (allHabits ?? []).map((h) => h.id)
    const { data: todayLogs } = allHabitIds.length
      ? await db
          .from('habit_logs')
          .select('habit_id, completed')
          .in('habit_id', allHabitIds)
          .eq('date', today)
      : { data: [] }

    // Index logs by habit_id
    const logMap: Record<string, boolean> = {}
    for (const l of todayLogs ?? []) {
      logMap[l.habit_id] = l.completed
    }

    // Build friend list
    const friends = (friendships ?? []).map((f) => {
      const friendId = f.user_id === userId ? f.friend_id : f.user_id
      const profile = profileMap[friendId] ?? {}
      const habitIds = habitsByUser[friendId] ?? []
      const completedToday = habitIds.filter((id) => logMap[id] === true).length
      const loggedToday = habitIds.filter((id) => id in logMap).length

      return {
        friendship_id: f.id,
        friend_id: friendId,
        display_name: profile.display_name ?? 'Friend',
        avatar_url: profile.avatar_url ?? null,
        habits_today: habitIds.length,
        completed_today: completedToday,
        logged_today: loggedToday,
        completion_rate: habitIds.length > 0 ? completedToday / habitIds.length : 0,
      }
    })

    // Incoming pending requests (where current user is the friend_id)
    const { data: pendingRaw, error: pendingError } = await db
      .from('friendships')
      .select('id, user_id')
      .eq('friend_id', userId)
      .eq('status', 'pending')

    if (pendingError) throw pendingError

    const requesterIds = (pendingRaw ?? []).map((p) => p.user_id)
    const { data: requesterProfiles } = requesterIds.length
      ? await db.from('users').select('id, display_name, email').in('id', requesterIds)
      : { data: [] }

    const requesterMap = Object.fromEntries((requesterProfiles ?? []).map((p) => [p.id, p]))

    const pending = (pendingRaw ?? []).map((p) => {
      const profile = requesterMap[p.user_id] ?? {}
      return {
        friendship_id: p.id,
        user_id: p.user_id,
        display_name: profile.display_name ?? profile.email ?? 'Unknown',
      }
    })

    return NextResponse.json({ friends, pending })
  } catch (err) {
    console.error('[/api/social/friends GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
