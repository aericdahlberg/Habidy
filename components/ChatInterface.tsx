"use client"

import { useState, useRef, useEffect } from 'react'
import type { Message } from '@/lib/claude'

const MAX_TURNS = 20
const WARN_AT_TURNS = 5  // show counter when this many turns remain

type Props = {
  agentEndpoint: string
  userId?: string
  initialMessage?: string
  onHandoff?: () => void
  handoffLabel?: string
  onHabitReady?: (habitData: Record<string, string>) => void
  extraPayload?: Record<string, unknown>
}

export default function ChatInterface({
  agentEndpoint,
  userId,
  initialMessage,
  onHandoff,
  handoffLabel = 'Build a habit →',
  onHabitReady,
  extraPayload,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showHandoff, setShowHandoff] = useState(false)
  const [habitReady, setHabitReady] = useState(false)
  const [turnsRemaining, setTurnsRemaining] = useState<number>(MAX_TURNS)
  const [limitReached, setLimitReached] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load initial message on mount
  useEffect(() => {
    if (initialMessage) {
      setMessages([{ role: 'assistant', content: initialMessage }])
      return
    }
    fetchAgentReply([], true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function fetchAgentReply(msgs: Message[], isInit = false) {
    setLoading(true)
    try {
      const payload: Record<string, unknown> = {
        messages: msgs,
        userId,
        ...extraPayload,
      }

      const res = await fetch(agentEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json() as {
        message?: string
        habitReady?: boolean
        habitData?: Record<string, string>
        error?: string
        limitReached?: boolean
        turnsUsed?: number
        turnsRemaining?: number
        showHandoff?: boolean
      }

      // Hard API error (not limit-related)
      if (data.error && !data.limitReached) {
        const errMsg: Message = { role: 'assistant', content: "I'm having trouble right now. Please try again." }
        setMessages((prev) => (isInit ? [errMsg] : [...prev, errMsg]))
        return
      }

      // Update turn state
      if (typeof data.turnsRemaining === 'number') {
        setTurnsRemaining(data.turnsRemaining)
      }

      if (data.limitReached) {
        setLimitReached(true)
        if (data.message) {
          const limitMsg: Message = { role: 'assistant', content: data.message }
          setMessages((prev) => isInit ? [limitMsg] : [...prev, limitMsg])
        }
        return
      }

      if (data.message) {
        const agentMsg: Message = { role: 'assistant', content: data.message }
        setMessages((prev) => (isInit ? [agentMsg] : [...prev, agentMsg]))

        // Detect handoff trigger from content or API flag
        if (
          data.showHandoff ||
          data.message.toLowerCase().includes('build a habit') ||
          data.message.toLowerCase().includes('turn one of these')
        ) {
          setShowHandoff(true)
        }
      }

      if (data.habitReady && data.habitData && onHabitReady) {
        setHabitReady(true)
        onHabitReady(data.habitData)
      }
    } catch (err) {
      console.error('[ChatInterface] fetch error', err)
      const errMsg: Message = { role: 'assistant', content: "I'm having trouble connecting. Please try again." }
      setMessages((prev) => (isInit ? [errMsg] : [...prev, errMsg]))
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || loading || limitReached) return

    const userMsg: Message = { role: 'user', content: trimmed }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')

    await fetchAgentReply(nextMessages)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleStartFresh() {
    setMessages([])
    setLimitReached(false)
    setShowHandoff(false)
    setHabitReady(false)
    setTurnsRemaining(MAX_TURNS)
    if (initialMessage) {
      setMessages([{ role: 'assistant', content: initialMessage }])
    } else {
      fetchAgentReply([], true)
    }
  }

  const showTurnWarning = !limitReached && turnsRemaining <= WARN_AT_TURNS
  const inputDisabled = loading || limitReached

  return (
    <div className="flex h-full flex-col">
      {/* Turn warning banner */}
      {showTurnWarning && (
        <div className={`flex-shrink-0 px-4 py-2 text-center text-xs transition-colors ${
          turnsRemaining <= 2
            ? 'bg-amber-50 text-amber-700'
            : 'bg-zinc-50 text-zinc-500'
        }`}>
          {turnsRemaining === 1
            ? 'Last exchange — wrapping up'
            : `${turnsRemaining} exchanges remaining`}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-zinc-900 text-white rounded-br-sm'
                  : 'bg-zinc-100 text-zinc-900 rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-zinc-100 px-4 py-3">
              <span className="flex gap-1 items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}

        {/* Handoff button */}
        {(showHandoff && onHandoff && !habitReady && !limitReached) && (
          <div className="flex justify-center pt-2">
            <button
              onClick={onHandoff}
              className="rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
            >
              {handoffLabel}
            </button>
          </div>
        )}

        {/* Limit reached — actions */}
        {limitReached && (
          <div className="flex flex-col items-center gap-3 pt-2">
            {onHandoff && (
              <button
                onClick={onHandoff}
                className="rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
              >
                {handoffLabel}
              </button>
            )}
            <button
              onClick={handleStartFresh}
              className="text-xs text-zinc-400 underline underline-offset-2 hover:text-zinc-600"
            >
              Start a new conversation
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-100 px-4 py-3 pb-safe">
        {limitReached ? (
          <p className="text-center text-xs text-zinc-400 py-1">
            This conversation has ended.
          </p>
        ) : (
          <div className={`flex items-center gap-3 rounded-2xl border bg-white px-4 py-2.5 transition-colors ${
            inputDisabled ? 'border-zinc-100' : 'border-zinc-200'
          }`}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={loading ? 'Thinking...' : 'Type a message...'}
              disabled={inputDisabled}
              className="flex-1 bg-transparent text-sm text-zinc-900 placeholder-zinc-400 outline-none disabled:opacity-40"
            />
            <button
              onClick={handleSend}
              disabled={inputDisabled || !input.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-white transition-opacity disabled:opacity-30"
            >
              <svg className="h-4 w-4 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
