import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase'
import { getRouteUser } from '@/lib/supabaseServer'

export async function POST(req: NextRequest) {
  try {
    const user = await getRouteUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { mode } = await req.json() as { mode?: string }
    if (!mode || !['quick', 'guided', 'deep'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
    }

    const { error } = await adminClient()
      .from('users')
      .update({ engagement_mode: mode })
      .eq('id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/mode]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
