import { writeLog } from './logger'

export type AgentGuardOptions<T> = {
  agentName: string
  toolName: string
  input: Record<string, unknown>
  userId?: string | null
  fn: () => PromiseLike<T>
  assert?: (result: T) => void
}

export async function agentGuard<T>({
  agentName,
  toolName,
  input,
  userId,
  fn,
  assert,
}: AgentGuardOptions<T>): Promise<T> {
  const startMs = Date.now()
  let output: Record<string, unknown> | null = null
  let success = false
  let errorMsg: string | null = null

  try {
    const result = await fn()
    output = { result: result as unknown }

    if (assert) {
      assert(result)
    }

    success = true
    console.log(`[${agentName}/${toolName}] OK`, { input, output })
    return result
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    errorMsg = message
    console.error(`[${agentName}/${toolName}] ERROR`, { input, error: message })
    throw err
  } finally {
    await writeLog({
      userId: userId ?? null,
      agent: agentName,
      toolName,
      input,
      output,
      success,
      error: errorMsg,
      durationMs: Date.now() - startMs,
    })
  }
}
