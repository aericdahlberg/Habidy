import type { Message } from '@/lib/claude'
import { writeLog } from '@/lib/logger'

export class FlaggedInputError extends Error {
  constructor(
    public readonly field: string,
    public readonly userId: string | null,
    public readonly preview: string,
  ) {
    super('INPUT_FLAGGED')
    this.name = 'FlaggedInputError'
  }
}

export const INJECTION_PATTERNS: RegExp[] = [
  /ignore (previous|above|all) instructions/i,
  /you are now/i,
  /new persona/i,
  /disregard your/i,
  /system prompt/i,
  /\[INST\]/i,
  /<\|.*?\|>/,
  /###\s*(system|instruction)/i,
  /act as (a )?(different|new|another)/i,
  /pretend (you are|to be)/i,
  /forget (everything|all|your)/i,
  /override (your|all)/i,
  /jailbreak/i,
]

function stripControlChars(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
}

function logInjectionAttempt(userId: string | null, fieldName: string, rawInput: string): void {
  void writeLog({
    userId,
    agent: 'guardrail',
    toolName: 'injection_attempt',
    input: { fieldName, preview: rawInput.slice(0, 100), length: rawInput.length },
    output: null,
    success: false,
    error: `Injection pattern detected in ${fieldName}`,
    durationMs: 0,
  })
}

// Neutralise fence marker strings that could let user content escape a [USER CONTEXT] block.
// Inserts a zero-width space (U+200B) to break the pattern without altering visible text.
const ZWS = '​'
export function escapeFenceMarkers(s: string): string {
  return s
    .replace(/\[USER CONTEXT\]/gi,             `[USER${ZWS}CONTEXT]`)
    .replace(/\[\/USER CONTEXT\]/gi,            `[/USER${ZWS}CONTEXT]`)
    .replace(/\[CONVERSATION TRANSCRIPT\]/gi,   `[CONVERSATION${ZWS}TRANSCRIPT]`)
    .replace(/\[\/CONVERSATION TRANSCRIPT\]/gi,  `[/CONVERSATION${ZWS}TRANSCRIPT]`)
    .replace(/\[CALENDAR CONTEXT\]/gi,          `[CALENDAR${ZWS}CONTEXT]`)
    .replace(/\[\/CALENDAR CONTEXT\]/gi,         `[/CALENDAR${ZWS}CONTEXT]`)
}

export function sanitizeUserInput(
  input: unknown,
  fieldName: string,
  userId: string | null,
  opts?: { maxLength?: number; flagPatterns?: boolean },
): string {
  const maxLength = opts?.maxLength ?? 1000
  const flag = opts?.flagPatterns !== false   // default true

  const raw = typeof input === 'string' ? input : ''
  const cleaned = stripControlChars(raw).slice(0, maxLength).trim()

  if (flag) {
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(cleaned)) {
        logInjectionAttempt(userId, fieldName, raw)
        throw new FlaggedInputError(fieldName, userId, raw.slice(0, 100))
      }
    }
  }

  return cleaned
}

// Sanitize full message history — strips control chars but does NOT regex-flag
// (history was already vetted turn-by-turn when each message was received).
export function sanitizeMessageHistory(messages: Message[], userId: string | null): Message[] {
  return messages.map((m) => ({
    ...m,
    content: sanitizeUserInput(m.content, `history_${m.role}`, userId, {
      maxLength: 2000,
      flagPatterns: false,
    }),
  }))
}

// Sanitize only the latest user message with full pattern flagging.
export function sanitizeLatestUserMessage(messages: Message[], userId: string | null): Message[] {
  const lastUserIdx = [...messages]
    .map((m, i) => ({ m, i }))
    .reverse()
    .find(({ m }) => m.role === 'user')?.i
  if (lastUserIdx === undefined) return messages

  return messages.map((m, i) => {
    if (i !== lastUserIdx) return m
    return {
      ...m,
      content: sanitizeUserInput(m.content, 'user_message', userId, {
        maxLength: 2000,
        flagPatterns: true,
      }),
    }
  })
}