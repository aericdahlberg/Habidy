import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase'
import { getRouteUser } from '@/lib/supabaseServer'

const VALID_TIMEZONES = new Set(Intl.supportedValuesOf('timeZone'))

export async function PATCH(req: NextRequest) {
  const user = await getRouteUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { timezone?: unknown }
  const { timezone } = body

  if (typeof timezone !== 'string' || !VALID_TIMEZONES.has(timezone)) {
    return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 })
  }

  const { error } = await adminClient()
    .from('users')
    .update({ timezone })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
