import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
}
