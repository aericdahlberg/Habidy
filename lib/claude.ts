import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? 'placeholder-api-key',
})

export type Message = {
  role: 'user' | 'assistant'
  content: string
}

export type CallClaudeOptions = {
  systemPrompt: string
  messages: Message[]
  maxTokens?: number
}

export async function callClaude({ systemPrompt, messages, maxTokens = 1024 }: CallClaudeOptions): Promise<string> {
  // Anthropic API requires at least one message
  const safeMessages = messages.length > 0 ? messages : [{ role: 'user' as const, content: 'Hello' }]

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: safeMessages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  })

  const block = response.content[0]
  if (block.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }
  return block.text
}
