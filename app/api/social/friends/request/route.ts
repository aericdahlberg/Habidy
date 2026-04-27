import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { user_id, email } = await req.json() as { user_id: string; email: string }

    if (!user_id || !email?.trim()) {
      return NextResponse.json({ error: 'Missing user_id or email' }, { status: 400 })
    }

    const db = adminClient()
    const targetEmail = email.trim().toLowerCase()

    // Look up target user by email in the users table
    const { data: targetUser, error: lookupError } = await db
      .from('users')
      .select('id, display_name')
      .eq('email', targetEmail)
      .maybeSingle()

    if (lookupError) throw lookupError

    if (!targetUser) {
      return NextResponse.json({ error: 'No Habidy user found with that email' }, { status: 404 })
    }

    if (targetUser.id === user_id) {
      return NextResponse.json({ error: "You can't add yourself" }, { status: 400 })
    }

    // Check for existing friendship in either direction
    const { data: existing } = await db
      .from('friendships')
      .select('id, status')
      .or(
        `and(user_id.eq.${user_id},friend_id.eq.${targetUser.id}),and(user_id.eq.${targetUser.id},friend_id.eq.${user_id})`
      )
      .maybeSingle()

    if (existing) {
      const msg =
        existing.status === 'accepted' ? 'Already friends' : 'Request already sent'
      return NextResponse.json({ error: msg }, { status: 409 })
    }

    const { data: friendship, error: insertError } = await db
      .from('friendships')
      .insert({ user_id, friend_id: targetUser.id, status: 'pending' })
      .select()
      .single()

    if (insertError) throw insertError

    return NextResponse.json({
      friendship,
      display_name: targetUser.display_name ?? targetEmail,
    })
  } catch (err) {
    console.error('[/api/social/friends/request POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
