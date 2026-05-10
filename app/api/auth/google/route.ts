import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'
import { buildGoogleAuthUrl } from '@/lib/google-auth'

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
  if (!user) return NextResponse.redirect(new URL('/login', req.url))

  const rawFrom = req.nextUrl.searchParams.get('from')
  const from: 'onboarding' | 'profile' = rawFrom === 'onboarding' ? 'onboarding' : 'profile'

  // Generate a one-time nonce for CSRF protection.
  // Stored as an HttpOnly, SameSite=Lax cookie and verified in the callback.
  const nonce = randomUUID()
  const authUrl = buildGoogleAuthUrl(nonce, from)

  const response = NextResponse.redirect(authUrl)
  response.cookies.set('google_oauth_nonce', nonce, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })
  return response
}
