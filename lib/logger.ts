import { adminClient } from './supabase'
import type { TokenUsage, Message } from './claude'

// ── Per-tool log (used by agentGuard) ────────────────────────────────────────

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
    await adminClient().from('tool_logs').insert({
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

// ── Agent session log (written once per completed conversation) ───────────────

export type AgentSessionEntry = {
  userId: string | null | undefined
  /** Agent identifier, e.g. "architect" or "crystal_ball" */
  agent: string
  /** Resolved model string, e.g. "claude-sonnet-4-5" */
  model: string
  /** Number of completed user turns in this session */
  turnsUsed: number
  /** Token usage from the final LLM call, if available */
  tokenUsage?: TokenUsage | null
  /** true = session ended naturally (habits ready / summary saved);
   *  false = hit the turn limit */
  goalReached: boolean
  /** Full message history at session end */
  conversation: Message[]
}

/**
 * Write a single row to tool_logs representing the end of an agent session.
 * tool_name is set to "session_end" so these rows are easy to filter separately
 * from per-tool call rows.
 *
 * Never throws — failures are logged to console only.
 */
export async function logAgentSession(entry: AgentSessionEntry): Promise<void> {
  try {
    await adminClient().from('tool_logs').insert({
      user_id: entry.userId ?? null,
      agent: entry.agent,
      tool_name: 'session_end',
      input: {
        model: entry.model,
        turnsUsed: entry.turnsUsed,
        goalReached: entry.goalReached,
        conversation: entry.conversation,
      },
      output: entry.tokenUsage
        ? {
            inputTokens: entry.tokenUsage.inputTokens,
            outputTokens: entry.tokenUsage.outputTokens,
            totalTokens: entry.tokenUsage.totalTokens,
          }
        : null,
      success: entry.goalReached,
      error: null,
      duration_ms: null,
    })
  } catch (err) {
    console.error('[logger] Failed to write agent session log:', err)
  }
}
