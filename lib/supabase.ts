import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'

// createBrowserClient (from @supabase/ssr) is required for the new sb_publishable_ key format.
// The legacy createClient from @supabase/supabase-js fell back to sending the raw key as
// Authorization: Bearer — which works with the old eyJ JWT anon keys (they are valid JWTs)
// but is explicitly rejected by Supabase when using the new non-JWT publishable key format.
// createBrowserClient uses PKCE flow + cookie-based session storage, ensuring the real user
// JWT is always used for Authorization headers and the raw key is never sent as a Bearer token.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Server-side admin client — uses SUPABASE_SERVICE_ROLE_KEY when set so it
// bypasses RLS. Falls back to the anon key in local dev. Never exported as a
// shared instance; always created fresh for each server-side call.
function adminClient() {
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseAnonKey,
  )
}

/**
 * Returns the AI-generated profile summary for a user, or null if none exists.
 * Called server-side by agents to inject user context into their system prompts.
 */
export async function getProfileContext(userId: string): Promise<string | null> {
  const { data } = await adminClient()
    .from('user_profile_context')
    .select('summary')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.summary ?? null
}

export type Database = {
  users: {
    id: string
    email: string
    name: string | null
    identity_statement: string | null
    goal_category: string | null
    friction_point: string | null
    time_available: string | null
    onboarding_done: boolean
    created_at: string
  }
  habits: {
    id: string
    user_id: string
    name: string
    identity_link: string | null
    cue: string | null
    craving: string | null
    action: string | null
    reward: string | null
    two_minute_version: string | null
    time_of_day: string | null
    goal_category: string | null
    is_active: boolean
    created_at: string
  }
  habit_logs: {
    id: string
    habit_id: string
    user_id: string
    date: string
    completed: boolean
    logged_at: string
  }
  conversation_memory: {
    id: string
    user_id: string
    agent: string
    summary: string | null
    created_at: string
  }
  tool_logs: {
    id: string
    user_id: string | null
    agent: string | null
    tool_name: string | null
    input: Record<string, unknown> | null
    output: Record<string, unknown> | null
    success: boolean | null
    error: string | null
    duration_ms: number | null
    created_at: string
  }
  user_reflections: {
    id: string
    user_id: string
    content: string
    created_at: string
  }
  user_profile_context: {
    id: string
    user_id: string
    summary: string | null
    updated_at: string
  }
  proposed_habits: {
    id: string
    user_id: string
    habit_data: Record<string, unknown>
    selected: boolean
    created_at: string
  }
  habit_survey_responses: {
    id: string
    user_id: string
    habit_id: string
    date: string
    went_right: string | null
    went_wrong: string | null
    completion_level: 'full' | 'partial' | 'none' | null
    created_at: string
  }
}
