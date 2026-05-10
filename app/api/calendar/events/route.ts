import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getValidAccessToken } from '@/lib/google-auth'
import { getCalendarEvents } from '@/lib/google-calendar'

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accessToken = await getValidAccessToken(user.id)
  if (!accessToken) return NextResponse.json({ events: [], connected: false })

  try {
    const now = new Date()
    const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    const events = await getCalendarEvents(accessToken, now, twoWeeksOut)
    return NextResponse.json({ events, connected: true })
  } catch (err) {
    console.error('[GET /api/calendar/events]', err)
    return NextResponse.json({ events: [], connected: true, error: 'Failed to fetch events' })
  }
}
