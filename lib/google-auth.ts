import { adminClient } from '@/lib/supabase'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ')

// state encodes userId + origin so callback knows where to redirect back
export function buildGoogleAuthUrl(userId: string, from: 'onboarding' | 'profile'): string {
  const state = `${userId}:${from}`
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

type TokenResponse = {
  access_token: string
  refresh_token: string
  expires_in: number
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Token exchange failed: ${res.status} ${body}`)
  }
  return res.json() as Promise<TokenResponse>
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`)
  return res.json() as Promise<{ access_token: string; expires_in: number }>
}

export async function storeTokens(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
): Promise<void> {
  const supabase = adminClient()
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()
  await supabase.from('google_calendar_tokens').upsert(
    { user_id: userId, access_token: accessToken, refresh_token: refreshToken, expires_at: expiresAt, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  )
  await supabase.from('users').update({ google_calendar_connected: true }).eq('id', userId)
}

export async function disconnectCalendar(userId: string): Promise<void> {
  const supabase = adminClient()
  await supabase.from('google_calendar_tokens').delete().eq('user_id', userId)
  await supabase.from('users').update({ google_calendar_connected: false }).eq('id', userId)
}

// Returns a valid access token, refreshing if expired. Returns null if not connected.
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const supabase = adminClient()
  const { data } = await supabase
    .from('google_calendar_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single()

  if (!data) return null

  // Return existing token if still valid (with 5-min buffer)
  if (new Date(data.expires_at) > new Date(Date.now() + 5 * 60 * 1000)) {
    return data.access_token as string
  }

  try {
    const { access_token, expires_in } = await refreshAccessToken(data.refresh_token as string)
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString()
    await supabase
      .from('google_calendar_tokens')
      .update({ access_token, expires_at: expiresAt, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
    return access_token
  } catch {
    return null
  }
}
