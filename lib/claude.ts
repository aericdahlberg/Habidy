import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? 'placeholder-api-key',
})

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? 'placeholder-openai-key',
})

// Supported models. The AGENT_MODEL env var must be one of these (or left unset).
export const ANTHROPIC_MODELS = [
  'claude-opus-4-5',
  'claude-sonnet-4-5',
  'claude-haiku-4-5-20251001',
  // Current production default kept for backwards compat
  'claude-sonnet-4-6',
  'claude-opus-4-6',
  'claude-haiku-4-5',
] as const

export const OPENAI_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'o3-mini',
] as const

export type SupportedModel =
  | (typeof ANTHROPIC_MODELS)[number]
  | (typeof OPENAI_MODELS)[number]

/** Default used when AGENT_MODEL env var is absent or blank. */
export const DEFAULT_MODEL: SupportedModel = 'claude-sonnet-4-5'

/** Resolve the model to use: env var → passed-in override → default. */
export function resolveModel(override?: string): SupportedModel {
  const candidate = override ?? process.env.AGENT_MODEL ?? DEFAULT_MODEL
  return candidate as SupportedModel
}

export type Message = {
  role: 'user' | 'assistant'
  content: string
}

/** Token counts returned by the underlying API for one call. */
export type TokenUsage = {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export type CallClaudeOptions = {
  systemPrompt: string
  messages: Message[]
  maxTokens?: number
  /** Explicit model override; falls back to resolveModel(). */
  model?: string
  /** Called with token usage after the API responds. Never throws. */
  onUsage?: (usage: TokenUsage) => void
}

export async function callClaude({
  systemPrompt,
  messages,
  maxTokens = 1024,
  model,
  onUsage,
}: CallClaudeOptions): Promise<string> {
  const resolvedModel = resolveModel(model)

  if ((OPENAI_MODELS as readonly string[]).includes(resolvedModel)) {
    return callOpenAI({ systemPrompt, messages, maxTokens, model: resolvedModel, onUsage })
  }
  return callAnthropic({ systemPrompt, messages, maxTokens, model: resolvedModel, onUsage })
}

// ── Anthropic ─────────────────────────────────────────────────────────────────

async function callAnthropic({
  systemPrompt,
  messages,
  maxTokens,
  model,
  onUsage,
}: Required<Omit<CallClaudeOptions, 'onUsage'>> & { onUsage?: (u: TokenUsage) => void }): Promise<string> {
  const safeMessages = messages.length > 0
    ? messages
    : [{ role: 'user' as const, content: 'Hello' }]

  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: safeMessages.map((m) => ({ role: m.role, content: m.content })),
  })

  if (onUsage) {
    try {
      onUsage({
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      })
    } catch { /* never let usage callback crash the caller */ }
  }

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Anthropic')
  return block.text
}

// ── OpenAI ────────────────────────────────────────────────────────────────────

async function callOpenAI({
  systemPrompt,
  messages,
  maxTokens,
  model,
  onUsage,
}: Required<Omit<CallClaudeOptions, 'onUsage'>> & { onUsage?: (u: TokenUsage) => void }): Promise<string> {
  const safeMessages = messages.length > 0
    ? messages
    : [{ role: 'user' as const, content: 'Hello' }]

  const response = await openai.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      ...safeMessages.map((m) => ({ role: m.role, content: m.content })),
    ],
  })

  if (onUsage && response.usage) {
    try {
      onUsage({
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      })
    } catch { /* never let usage callback crash the caller */ }
  }

  const text = response.choices[0]?.message?.content
  if (!text) throw new Error('Unexpected empty response from OpenAI')
  return text
}
