import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { exchangeCodeForTokens, storeTokens } from '@/lib/google-auth'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state') // "nonce:from"
  const error = searchParams.get('error')

  const errorDest = new URL('/profile?calendar=error', req.url)

  if (error || !code || !state) return NextResponse.redirect(errorDest)

  const colonIdx = state.indexOf(':')
  if (colonIdx === -1) return NextResponse.redirect(errorDest)
  const stateNonce = state.slice(0, colonIdx)
  const from = state.slice(colonIdx + 1)

  // Validate from to avoid open redirects
  if (from !== 'onboarding' && from !== 'profile') return NextResponse.redirect(errorDest)

  const cookieStore = await cookies()

  // Verify nonce — prevents CSRF / forced-binding attacks
  const cookieNonce = cookieStore.get('google_oauth_nonce')?.value
  if (!cookieNonce || cookieNonce !== stateNonce) {
    console.error('[Google OAuth callback] nonce mismatch')
    return NextResponse.redirect(errorDest)
  }

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
  if (!user) return NextResponse.redirect(errorDest)

  try {
    const { access_token, refresh_token, expires_in } = await exchangeCodeForTokens(code)
    await storeTokens(user.id, access_token, refresh_token, expires_in)

    const dest = from === 'onboarding' ? '/onboarding/loading' : '/profile?calendar=connected'
    const response = NextResponse.redirect(new URL(dest, req.url))
    // Clear the nonce cookie now that it's been used
    response.cookies.set('google_oauth_nonce', '', { maxAge: 0, path: '/' })
    return response
  } catch (err) {
    console.error('[Google OAuth callback] token exchange failed:', (err as Error).message)
    return NextResponse.redirect(errorDest)
  }
}
