import { supabase } from './supabase'

export type LogEntry = {
  userId?: string | null
  agent?: string | null
  toolName: string
  input: Record<string, unknown>
  output: Record<string, unknown> | null
  success: boolean
  error?: string | null
  durationMs: number
}

export async function writeLog(entry: LogEntry): Promise<void> {
  try {
    await supabase.from('tool_logs').insert({
      user_id: entry.userId ?? null,
      agent: entry.agent ?? null,
      tool_name: entry.toolName,
      input: entry.input,
      output: entry.output,
      success: entry.success,
      error: entry.error ?? null,
      duration_ms: entry.durationMs,
    })
  } catch (err) {
    // Logger failures must never crash the app — just console.error
    console.error('[logger] Failed to write log:', err)
  }
}
