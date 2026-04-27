import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { user_id, friendship_id, action } = await req.json() as {
      user_id: string
      friendship_id: string
      action: 'accept' | 'decline'
    }

    if (!user_id || !friendship_id || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const db = adminClient()

    // Verify the current user is the recipient of this request
    const { data: friendship, error: fetchError } = await db
      .from('friendships')
      .select('id, friend_id, status')
      .eq('id', friendship_id)
      .eq('friend_id', user_id)
      .eq('status', 'pending')
      .maybeSingle()

    if (fetchError) throw fetchError

    if (!friendship) {
      return NextResponse.json({ error: 'Request not found or already responded' }, { status: 404 })
    }

    if (action === 'accept') {
      const { error } = await db
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendship_id)

      if (error) throw error
      return NextResponse.json({ status: 'accepted' })
    } else {
      const { error } = await db
        .from('friendships')
        .delete()
        .eq('id', friendship_id)

      if (error) throw error
      return NextResponse.json({ status: 'declined' })
    }
  } catch (err) {
    console.error('[/api/social/friends/respond POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
